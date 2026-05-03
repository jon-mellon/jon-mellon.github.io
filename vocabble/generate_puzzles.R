#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(jsonlite)
})

`%||%` <- function(x, y) {
  if (is.null(x)) y else x
}

fleet_lengths <- c(6, 5, 4, 4, 3, 3)
board_size <- 8

repo_root <- normalizePath(getwd(), mustWork = TRUE)
if (!file.exists(file.path(repo_root, "config.yaml"))) {
  repo_root <- normalizePath(file.path(dirname(normalizePath(commandArgs(FALSE)[1], mustWork = FALSE)), ".."), mustWork = FALSE)
}

read_dictionary <- function() {
  local_dictionary <- file.path(repo_root, "vocabble", "wordlist.txt")
  system_dictionary <- "/usr/share/dict/words"
  source_path <- if (file.exists(local_dictionary)) local_dictionary else system_dictionary
  if (!file.exists(source_path)) {
    stop("No dictionary found. Add vocabble/wordlist.txt or install /usr/share/dict/words.")
  }

  words_raw <- readLines(source_path, warn = FALSE, encoding = "UTF-8")
  words_raw <- words_raw[grepl("^[A-Za-z]+$", words_raw)]

  exclusions_path <- file.path(repo_root, "vocabble", "bad_words.txt")
  exclusions <- if (file.exists(exclusions_path)) readLines(exclusions_path, warn = FALSE) else character()
  exclusions <- unique(toupper(trimws(exclusions[nzchar(exclusions)])))

  words <- unique(toupper(words_raw))
  words <- words[nchar(words) %in% 3:8]
  words <- words[!words %in% exclusions]

  # Keep the generator deterministic and puzzle-friendly: avoid very rare forms
  # that are mostly punctuation-free but still poor daily-puzzle entries.
  words <- words[!grepl("(INGLY|NESS|LESS|MENT)$", words) | nchar(words) <= 6]
  split(words, nchar(words))
}

fixture_boards <- function() {
  variants <- expand.grid(
    opener = c("CAPS", "COPS", "CUPS"),
    short = c("NAY", "SAY", "SOY"),
    five = c("LENIS", "LEVIS"),
    lower = c("DEN", "DIN", "DON", "DUE"),
    stringsAsFactors = FALSE
  )

  fixtures <- list()
  for (ii in seq_len(nrow(variants))) {
    variant <- variants[ii, ]
    base <- matrix("", nrow = board_size, ncol = board_size)
    base[1:4, 1] <- strsplit(variant$opener, "", fixed = TRUE)[[1]]
    base[2, 3:8] <- strsplit("CATION", "", fixed = TRUE)[[1]]
    base[4, 4:6] <- strsplit(variant$short, "", fixed = TRUE)[[1]]
    base[5:8, 7] <- strsplit("USES", "", fixed = TRUE)[[1]]
    base[6, 1:5] <- strsplit(variant$five, "", fixed = TRUE)[[1]]
    base[8, 1:3] <- strsplit(variant$lower, "", fixed = TRUE)[[1]]

    base_ships <- list(
      list(word = variant$opener, length = 4, row = 1, col = 1, direction = "V"),
      list(word = "CATION", length = 6, row = 2, col = 3, direction = "H"),
      list(word = variant$short, length = 3, row = 4, col = 4, direction = "H"),
      list(word = "USES", length = 4, row = 5, col = 7, direction = "V"),
      list(word = variant$five, length = 5, row = 6, col = 1, direction = "H"),
      list(word = variant$lower, length = 3, row = 8, col = 1, direction = "H")
    )

    transposed_ships <- lapply(base_ships, function(ship) {
      list(
        word = ship$word,
        length = ship$length,
        row = ship$col,
        col = ship$row,
        direction = if (ship$direction == "H") "V" else "H"
      )
    })

    fixtures[[length(fixtures) + 1]] <- list(board = base, ships = base_ships, side = "CAPSULES", top = "DECISION")
    fixtures[[length(fixtures) + 1]] <- list(board = t(base), ships = transposed_ships, side = "DECISION", top = "CAPSULES")
  }
  fixtures
}

empty_board <- function() {
  matrix("", nrow = board_size, ncol = board_size)
}

neighbors4 <- function(row, col) {
  out <- rbind(
    c(row - 1, col),
    c(row + 1, col),
    c(row, col - 1),
    c(row, col + 1)
  )
  out[out[, 1] >= 1 & out[, 1] <= board_size & out[, 2] >= 1 & out[, 2] <= board_size, , drop = FALSE]
}

placement_cells <- function(row, col, direction, length) {
  if (direction == "H") {
    cbind(row = row, col = col:(col + length - 1))
  } else {
    cbind(row = row:(row + length - 1), col = col)
  }
}

can_place <- function(board, row, col, direction, letters) {
  length <- length(letters)
  if (direction == "H" && col + length - 1 > board_size) return(FALSE)
  if (direction == "V" && row + length - 1 > board_size) return(FALSE)

  cells <- placement_cells(row, col, direction, length)
  !any(board[cells] != "")
}

place_word <- function(board, row, col, direction, word) {
  cells <- placement_cells(row, col, direction, nchar(word))
  board[cells] <- strsplit(word, "", fixed = TRUE)[[1]]
  board
}

find_edge_word <- function(edge_words, letter_sets) {
  candidates <- edge_words[
    vapply(edge_words, function(word) {
      letters <- strsplit(word, "", fixed = TRUE)[[1]]
      all(mapply(`%in%`, letters, letter_sets))
    }, logical(1))
  ]
  if (!length(candidates)) return(NA_character_)
  sample(candidates, 1)
}

make_candidate_board <- function(dictionary) {
  board <- empty_board()
  ships <- list()

  for (ship_index in seq_along(fleet_lengths)) {
    length <- fleet_lengths[[ship_index]]
    pool <- dictionary[[as.character(length)]]
    pool <- pool[!pool %in% vapply(ships, `[[`, character(1), "word")]
    placed <- FALSE
    for (attempt in seq_len(250)) {
      word <- sample(pool, 1)
      direction <- sample(c("H", "V"), 1)
      row <- sample(seq_len(board_size), 1)
      col <- sample(seq_len(board_size), 1)
      letters <- strsplit(word, "", fixed = TRUE)[[1]]
      if (!can_place(board, row, col, direction, letters)) next
      board <- place_word(board, row, col, direction, word)
      ships[[length(ships) + 1]] <- list(
        word = word,
        length = length,
        row = row,
        col = col,
        direction = direction
      )
      placed <- TRUE
      break
    }
    if (!placed) return(NULL)
  }

  if (any(rowSums(board != "") == 0) || any(colSums(board != "") == 0)) return(NULL)

  row_sets <- apply(board, 1, function(x) unique(x[x != ""]))
  col_sets <- apply(board, 2, function(x) unique(x[x != ""]))
  edge_words <- dictionary[["8"]]
  side_word <- find_edge_word(edge_words, row_sets)
  top_word <- find_edge_word(edge_words, col_sets)
  if (is.na(side_word) || is.na(top_word) || side_word == top_word) return(NULL)

  list(board = board, ships = ships, side = side_word, top = top_word)
}

mask_puzzle <- function(board, top_word, side_word, seed) {
  set.seed(seed)
  filled <- which(board != "")
  givens <- integer()

  for (cell in split(filled, rep(seq_along(fleet_lengths), fleet_lengths))) {
    givens <- c(givens, sample(cell, 1))
  }
  remaining <- setdiff(filled, givens)
  target_givens <- min(length(filled), 10)
  if (length(givens) < target_givens) {
    givens <- c(givens, sample(remaining, target_givens - length(givens)))
  }

  puzzle <- matrix("", nrow = board_size, ncol = board_size)
  puzzle[givens] <- board[givens]

  top_visible <- rep(FALSE, board_size)
  side_visible <- rep(FALSE, board_size)
  top_visible[sample(seq_len(board_size), 4)] <- TRUE
  side_visible[sample(seq_len(board_size), 4)] <- TRUE

  list(
    puzzle = puzzle,
    top_visible = top_visible,
    side_visible = side_visible
  )
}

validate_candidate <- function(candidate, dictionary) {
  board <- candidate$board
  words <- c(vapply(candidate$ships, `[[`, character(1), "word"), candidate$side, candidate$top)
  lengths_ok <- sort(vapply(candidate$ships, `[[`, numeric(1), "length")) == sort(fleet_lengths)
  dictionary_ok <- all(words %in% unlist(dictionary, use.names = FALSE))
  row_sets <- apply(board, 1, function(x) unique(x[x != ""]))
  col_sets <- apply(board, 2, function(x) unique(x[x != ""]))
  row_ok <- all(mapply(`%in%`, strsplit(candidate$side, "", fixed = TRUE)[[1]], row_sets))
  col_ok <- all(mapply(`%in%`, strsplit(candidate$top, "", fixed = TRUE)[[1]], col_sets))
  list(
    ok = all(lengths_ok, dictionary_ok, row_ok, col_ok, sum(board != "") == sum(fleet_lengths)),
    dictionary_ok = dictionary_ok,
    row_edge_ok = row_ok,
    col_edge_ok = col_ok
  )
}

matrix_to_rows <- function(board) {
  unname(lapply(seq_len(nrow(board)), function(ii) unname(as.character(board[ii, ]))))
}

make_puzzle <- function(date, id, seed, dictionary, fixture) {
  set.seed(seed)
  validation <- validate_candidate(fixture, dictionary)
  if (!validation$ok) stop("Fixture board failed validation for ", date)

  masked <- mask_puzzle(fixture$board, fixture$top, fixture$side, seed)
  hidden_letters <- sum(fixture$board != "") - sum(masked$puzzle != "")
  hidden_edges <- sum(!masked$top_visible) + sum(!masked$side_visible)

  list(
    id = id,
    date = date,
    size = board_size,
    fleetLengths = fleet_lengths,
    solution = matrix_to_rows(fixture$board),
    puzzle = matrix_to_rows(masked$puzzle),
    topWord = fixture$top,
    sideWord = fixture$side,
    topVisible = unname(masked$top_visible),
    sideVisible = unname(masked$side_visible),
    ships = fixture$ships,
    difficulty = list(
      label = "medium-hard",
      hiddenLetters = hidden_letters,
      hiddenEdges = hidden_edges,
      givenLetters = sum(masked$puzzle != "")
    ),
    validation = validation
  )
}

write_batch <- function(start_date = "2026-05-03", days = 90, seed_base = 20260503) {
  dictionary <- read_dictionary()
  fixtures <- fixture_boards()
  out_dir <- file.path(repo_root, "static", "vocabble", "puzzles")
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

  dates <- as.character(as.Date(start_date) + seq.int(0, days - 1))
  manifest <- list(
    generatedAt = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
    timezone = "UTC",
    startDate = start_date,
    days = days,
    puzzles = list()
  )

  for (ii in seq_along(dates)) {
    fixture <- fixtures[[(ii - 1) %% length(fixtures) + 1]]
    puzzle <- make_puzzle(
      date = dates[ii],
      id = sprintf("vocabble-%s", dates[ii]),
      seed = seed_base + ii,
      dictionary = dictionary,
      fixture = fixture
    )

    file_name <- sprintf("%s.json", dates[ii])
    write_json(puzzle, file.path(out_dir, file_name), pretty = TRUE, auto_unbox = TRUE)
    manifest$puzzles[[ii]] <- list(date = dates[ii], file = file_name, id = puzzle$id)
  }

  write_json(manifest, file.path(out_dir, "manifest.json"), pretty = TRUE, auto_unbox = TRUE)
  invisible(manifest)
}

args <- commandArgs(trailingOnly = TRUE)
days <- if (length(args) >= 1) as.integer(args[[1]]) else 90
start_date <- if (length(args) >= 2) args[[2]] else "2026-05-03"
write_batch(start_date = start_date, days = days)
