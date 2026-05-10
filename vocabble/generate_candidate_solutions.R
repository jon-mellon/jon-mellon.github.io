#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(jsonlite)
})

script_args <- commandArgs(FALSE)
script_files <- sub("^--file=", "", script_args[grepl("^--file=", script_args)])
script_dir <- if (length(script_files)) {
  dirname(normalizePath(script_files[[1]], mustWork = FALSE))
} else {
  file.path(getwd(), "vocabble")
}
source(file.path(script_dir, "generate_puzzles.R"))

candidate_has_full_edge_word <- function(puzzle) {
  all(unlist(puzzle$topVisible)) || all(unlist(puzzle$sideVisible))
}

candidate_rejection <- function(reason, attempt, seed, side_word = NA_character_, top_word = NA_character_, details = "") {
  data.frame(
    attempt = attempt,
    seed = seed,
    sideWord = side_word,
    topWord = top_word,
    reason = reason,
    details = details,
    stringsAsFactors = FALSE
  )
}

make_fast_edge_first_board <- function(dictionary,
                                       side_word,
                                       top_word,
                                       seed,
                                       sample_limit = 200,
                                       board_attempts = 70) {
  set.seed(seed)
  placements <- candidate_placements(
    dictionary,
    side_word,
    top_word,
    seed,
    sample_limit = sample_limit
  )
  names <- constraint_names(side_word, top_word)

  for (attempt in seq_len(board_attempts)) {
    board <- empty_board()
    occupied <- rep(FALSE, board_size * board_size)
    covered <- rep(FALSE, length(names))
    ships <- list()
    used_words <- character()

    for (ship_index in seq_along(fleet_lengths)) {
      length <- fleet_lengths[[ship_index]]
      pool <- placements[[as.character(length)]]
      usable <- pool[vapply(pool, function(candidate) {
        !candidate$word %in% used_words &&
          !any(occupied[candidate$cells]) &&
          !any(occupied[candidate$neighbors])
      }, logical(1))]
      if (!length(usable)) break

      scores <- vapply(usable, function(candidate) {
        100 * sum(candidate$covered & !covered) + sum(candidate$covered) + runif(1)
      }, numeric(1))
      shortlist <- order(scores, decreasing = TRUE)[seq_len(min(24, length(scores)))]
      chosen <- usable[[sample(shortlist, 1, prob = scores[shortlist] - min(scores[shortlist]) + 1)]]

      board <- place_word(board, chosen$row, chosen$col, chosen$direction, chosen$word)
      occupied[chosen$cells] <- TRUE
      covered <- covered | chosen$covered
      used_words <- c(used_words, chosen$word)
      ships[[length(ships) + 1]] <- list(
        word = chosen$word,
        length = chosen$length,
        row = chosen$row,
        col = chosen$col,
        direction = chosen$direction
      )
    }

    candidate <- list(board = board, ships = ships, side = side_word, top = top_word)
    validation <- validate_candidate(candidate, dictionary)
    if (length(ships) == length(fleet_lengths) && all(covered) && validation$ok) {
      return(candidate)
    }
  }

  NULL
}

make_candidate_puzzle <- function(candidate, dictionary, id, date, seed) {
  puzzle <- build_unique_clue_set(
    candidate = candidate,
    dictionary = dictionary,
    id = id,
    date = date,
    seed = seed,
    target_total_givens = 20,
    min_total_givens = 8,
    max_total_givens = 20,
    extra_board_passes = 0,
    seconds_per_trial = 8
  )
  if (is.null(puzzle)) return(NULL)

  best <- puzzle
  for (offset in c(100004, 100000, 200000)) {
    trial <- minimize_puzzle_clues(
      puzzle,
      dictionary = dictionary,
      seed = seed + offset,
      min_total_givens = 15,
      board_passes = 3,
      edge_passes = 0,
      seconds_per_trial = 4
    )
    if (trial$difficulty$givenLetters < best$difficulty$givenLetters) best <- trial
    if (best$difficulty$givenLetters <= 15) break
  }
  best
}

validate_candidate_puzzle <- function(puzzle, dictionary) {
  if (is.null(puzzle)) return("no_unique_clue_set")
  if (!isTRUE(puzzle$validation$ok)) return("invalid_board")
  if (!isTRUE(puzzle$uniqueness$unique)) return("not_unique")
  if (puzzle$difficulty$givenLetters > 15) return("too_many_givens")
  if (candidate_has_full_edge_word(puzzle)) return("full_edge_word")
  if (has_fully_clued_ship(puzzle)) return("full_ship_word")
  short_words <- vapply(puzzle$ships, `[[`, "", "word")
  short_words <- short_words[nchar(short_words) == 3]
  if (any(!short_words %in% preferred_three_letter_ship_words())) return("unfriendly_three_letter_word")

  disambiguated <- disambiguate_same_slot_words(puzzle, dictionary)
  if (disambiguated$difficulty$givenLetters != puzzle$difficulty$givenLetters) {
    return("same_slot_ambiguity")
  }

  strict <- count_puzzle_solutions(
    puzzle,
    dictionary,
    limit = 2,
    cache = new.env(parent = emptyenv()),
    deadline = proc.time()[["elapsed"]] + 8
  )
  if (isTRUE(strict$timedOut)) return("strict_solver_timeout")
  if (strict$count != 1) return("strict_not_unique")
  "ok"
}

write_candidate_outputs <- function(accepted, rejections, out_dir, attempts, seed_base) {
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)
  puzzle_dir <- file.path(out_dir, "puzzles")
  dir.create(puzzle_dir, recursive = TRUE, showWarnings = FALSE)

  manifest <- list(
    generatedAt = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
    attempts = attempts,
    seedBase = seed_base,
    accepted = length(accepted),
    criteria = list(
      validBoard = TRUE,
      uniqueBySolver = TRUE,
      noFullyShownShipWords = TRUE,
      noFullyShownEdgeWords = TRUE,
      noSameSlotAmbiguity = TRUE
    ),
    puzzles = list()
  )

  if (length(accepted)) {
    for (ii in seq_along(accepted)) {
      file_name <- sprintf("candidate-%03d.json", ii)
      write_json(accepted[[ii]], file.path(puzzle_dir, file_name), pretty = TRUE, auto_unbox = TRUE)
      manifest$puzzles[[ii]] <- list(
        id = accepted[[ii]]$id,
        date = accepted[[ii]]$date,
        file = file.path("puzzles", file_name),
        sideWord = accepted[[ii]]$sideWord,
        topWord = accepted[[ii]]$topWord,
        givenLetters = accepted[[ii]]$difficulty$givenLetters,
        hiddenEdges = accepted[[ii]]$difficulty$hiddenEdges
      )
    }
  }

  write_json(manifest, file.path(out_dir, "manifest.json"), pretty = TRUE, auto_unbox = TRUE)
  write.csv(rejections, file.path(out_dir, "rejections.csv"), row.names = FALSE)
  invisible(manifest)
}

generate_candidate_solutions <- function(attempts = 500,
                                         seed_base = 20260602,
                                         start_date = "2026-06-02",
                                         out_dir = file.path(repo_root, "vocabble", "candidate_solutions")) {
  dictionary <- read_dictionary()
  edge_words <- preferred_edge_words(dictionary)
  edge_pairs <- expand.grid(side = edge_words, top = edge_words, stringsAsFactors = FALSE)
  edge_pairs <- edge_pairs[edge_pairs$side != edge_pairs$top, ]
  set.seed(seed_base)
  edge_pairs <- edge_pairs[sample(seq_len(nrow(edge_pairs))), ]

  puzzle_dir <- file.path(out_dir, "puzzles")
  dir.create(puzzle_dir, recursive = TRUE, showWarnings = FALSE)
  unlink(file.path(puzzle_dir, "candidate-*.json"))
  unlink(file.path(out_dir, c("manifest.json", "rejections.csv")))

  accepted <- list()
  rejections <- data.frame(
    attempt = integer(),
    seed = integer(),
    sideWord = character(),
    topWord = character(),
    reason = character(),
    details = character(),
    stringsAsFactors = FALSE
  )

  for (attempt in seq_len(attempts)) {
    seed <- seed_base + attempt
    pair_index <- ((attempt - 1) %% nrow(edge_pairs)) + 1
    side_word <- edge_pairs$side[[pair_index]]
    top_word <- edge_pairs$top[[pair_index]]

    if (attempt %% 5 == 0) {
      message("Attempt ", attempt, "/", attempts, "; accepted ", length(accepted))
    }

    candidate <- make_fast_edge_first_board(dictionary, side_word, top_word, seed)
    if (is.null(candidate)) {
      rejections <- rbind(rejections, candidate_rejection("board_generation_failed", attempt, seed, side_word, top_word))
      next
    }

    validation <- validate_candidate(candidate, dictionary)
    if (!validation$ok) {
      rejections <- rbind(rejections, candidate_rejection("invalid_candidate_board", attempt, seed, side_word, top_word, paste(validation$errors, collapse = "; ")))
      next
    }

    candidate_date <- as.character(as.Date(start_date) + length(accepted))
    candidate_id <- sprintf("candidate-%s-%03d", candidate_date, attempt)
    puzzle <- make_candidate_puzzle(candidate, dictionary, candidate_id, candidate_date, seed)
    status <- validate_candidate_puzzle(puzzle, dictionary)
    if (status != "ok") {
      rejections <- rbind(rejections, candidate_rejection(status, attempt, seed, side_word, top_word))
      next
    }

    accepted[[length(accepted) + 1]] <- puzzle
    message("Accepted candidate ", length(accepted), " at attempt ", attempt, "; givens ", puzzle$difficulty$givenLetters)
    write_candidate_outputs(accepted, rejections, out_dir, attempts, seed_base)
  }

  manifest <- write_candidate_outputs(accepted, rejections, out_dir, attempts, seed_base)
  print(table(rejections$reason))
  message("Accepted ", manifest$accepted, " of ", attempts, " candidates into ", out_dir)
  invisible(manifest)
}

if (any(grepl("generate_candidate_solutions\\.R$", commandArgs(FALSE)))) {
  args <- commandArgs(trailingOnly = TRUE)
  attempts <- if (length(args) >= 1) as.integer(args[[1]]) else 500
  seed_base <- if (length(args) >= 2) as.integer(args[[2]]) else 20260602
  start_date <- if (length(args) >= 3) args[[3]] else "2026-06-02"
  generate_candidate_solutions(attempts = attempts, seed_base = seed_base, start_date = start_date)
}
