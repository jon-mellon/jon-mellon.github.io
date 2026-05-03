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
  source_paths <- c(local_dictionary, system_dictionary)
  source_paths <- source_paths[file.exists(source_paths)]
  if (!length(source_paths)) {
    stop("No dictionary found. Add vocabble/wordlist.txt or install /usr/share/dict/words.")
  }

  words_raw <- unique(unlist(lapply(source_paths, readLines, warn = FALSE, encoding = "UTF-8")))
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

preferred_edge_words <- function(dictionary) {
  preferred <- c(
    "LANGUAGE", "BUILDING", "DECISION", "CAPSULES", "COMPUTER", "QUESTION",
    "SOLUTION", "PLATFORM", "NOTEBOOK", "BACKPACK", "SANDWICH", "BASELINE",
    "SHIPYARD", "CROSSING", "BOUNDARY", "KEYBOARD", "WORKSHOP", "SEQUENCE",
    "FUNCTION", "VARIABLE", "RESEARCH", "EVIDENCE", "ANALYSIS", "MEASURED",
    "POLITICS", "ELECTION", "PAINTING", "MOUNTAIN", "HOSPITAL", "TREASURE",
    "DISTANCE", "NOTELESS", "STANDARD", "MAGAZINE", "AIRPLANE", "BASEBALL"
  )
  edge_words <- intersect(preferred, dictionary[["8"]])
  if (length(edge_words) < 8) {
    edge_words <- dictionary[["8"]][!grepl("(EDLY|NESS|TION)$", dictionary[["8"]])]
    edge_words <- head(edge_words[nchar(edge_words) == 8], 80)
  }
  unique(edge_words)
}

preferred_ship_words <- function() {
  c(
    "ACE", "ACT", "AGE", "AIM", "AIR", "ANT", "ARM", "ART", "ASH", "BAG",
    "BAR", "BAT", "BAY", "BED", "BEE", "BOX", "BOY", "BUN", "BUS", "CAB",
    "CAN", "CAP", "CAR", "CAT", "COW", "CUE", "CUP", "CUT", "DAY", "DEN",
    "DIG", "DOG", "DOT", "DUE", "EGG", "FAR", "FAT", "FIG", "FIN", "FLY",
    "FOX", "FUN", "GAS", "HAT", "HEN", "HOT", "ICE", "INK", "ION", "JAM",
    "JAR", "JET", "KEY", "LAP", "LAW", "LEG", "LOG", "MAN", "MAP", "NET",
    "OAK", "OAR", "OIL", "PAN", "PEN", "PIE", "PIN", "POT", "RAG", "RAT",
    "RED", "ROW", "RUN", "SEA", "SET", "SUN", "TAN", "TEA", "TEN", "TIN",
    "TOE", "TOP", "TOY", "USE", "VAN", "WAR", "WAY", "WIN", "YES",
    "ABLE", "ACID", "ACRE", "AREA", "ARMY", "AWAY", "BACK", "BALL", "BAND",
    "BANK", "BASE", "BEAR", "BEAT", "BIRD", "BLUE", "BOAT", "BONE", "BOOK",
    "BORN", "BULL", "CALL", "CAMP", "CARD", "CARE", "CASE", "CITY", "COAL",
    "COAT", "CODE", "COLD", "COME", "COOK", "COOL", "CROP", "DARK", "DATA",
    "DATE", "DAWN", "DECK", "DEEP", "DOOR", "DOWN", "DRAW", "DROP", "DUST",
    "EACH", "EAST", "EASY", "EDGE", "EVEN", "FACE", "FACT", "FARM", "FAST",
    "FILE", "FINE", "FIRE", "FISH", "FOOD", "FOOT", "FORM", "FOUR", "FREE",
    "GAME", "GATE", "GIFT", "GIRL", "GOLD", "GOOD", "GRAY", "GRID", "GROW",
    "HAND", "HARD", "HARM", "HEAD", "HEAT", "HELP", "HILL", "HOLD", "HOME",
    "HOPE", "HOST", "HOUR", "IRON", "JOIN", "JUMP", "KEEP", "KIND", "KING",
    "LAKE", "LAND", "LAST", "LEAF", "LEFT", "LIFE", "LINE", "LINK", "LIST",
    "LONG", "LOOK", "LOVE", "MAIN", "MAKE", "MARK", "MATH", "MILE", "MIND",
    "MINE", "MODE", "MOON", "MORE", "NAME", "NEAR", "NEED", "NEWS", "NEXT",
    "NICE", "NOTE", "OPEN", "PAGE", "PAIR", "PARK", "PART", "PATH", "PLAN",
    "PLAY", "PLOT", "PORT", "POST", "PULL", "PUSH", "RAIN", "READ", "REAL",
    "RING", "ROAD", "ROCK", "ROLE", "ROOT", "RULE", "SALT", "SAND", "SAVE",
    "SEAT", "SEED", "SHIP", "SHOP", "SHOW", "SIDE", "SIGN", "SILK", "SIZE",
    "SNOW", "SOFT", "SOIL", "STAR", "STEM", "STEP", "STOP", "SUIT", "TAKE",
    "TASK", "TEAM", "TELL", "TEND", "TEXT", "TIME", "TREE", "TURN", "UNIT",
    "USER", "VIEW", "WALK", "WALL", "WAVE", "WEEK", "WEST", "WIND", "WORD",
    "WORK", "YARD", "YEAR",
    "ABOUT", "ABOVE", "ACTOR", "ADAPT", "AFTER", "AGAIN", "AGENT", "AGREE",
    "ALERT", "ALIKE", "ALIVE", "ALLOW", "ALONE", "ALONG", "ALTER", "AMONG",
    "ANGLE", "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE", "AUDIO", "AVOID",
    "BASIC", "BEACH", "BEGIN", "BEING", "BELOW", "BENCH", "BIRTH", "BLACK",
    "BLEND", "BLOCK", "BOARD", "BRAIN", "BRAND", "BRAVE", "BREAD", "BREAK",
    "BRICK", "BRING", "BROWN", "BUILD", "CABLE", "CARRY", "CAUSE", "CHAIN",
    "CHAIR", "CHART", "CHECK", "CHEST", "CHILD", "CHOIR", "CIVIL", "CLAIM",
    "CLASS", "CLEAN", "CLEAR", "CLIMB", "CLOCK", "CLOSE", "CLOUD", "COAST",
    "COLOR", "COUNT", "COURT", "COVER", "CRAFT", "CROSS", "CROWD", "CYCLE",
    "DAILY", "DANCE", "DEPTH", "DOUBT", "DRAFT", "DRAMA", "DREAM", "DRINK",
    "DRIVE", "EARLY", "EARTH", "EMPTY", "ENJOY", "ENTER", "EVENT", "EVERY",
    "EXACT", "FIELD", "FINAL", "FIRST", "FLOOR", "FOCUS", "FORCE", "FRAME",
    "FRESH", "FRONT", "FRUIT", "GLASS", "GRANT", "GRASS", "GREAT", "GREEN",
    "GROUP", "GUARD", "GUESS", "GUIDE", "HAPPY", "HEART", "HEAVY", "HORSE",
    "HOTEL", "HOUSE", "HUMAN", "IDEAL", "IMAGE", "INDEX", "INNER", "INPUT",
    "ISSUE", "JOINT", "JUDGE", "KNIFE", "LABEL", "LARGE", "LATER", "LAUGH",
    "LAYER", "LEARN", "LEAST", "LEVEL", "LIGHT", "LOCAL", "LOGIC", "LUCKY",
    "LUNCH", "MAGIC", "MAJOR", "MATCH", "MAYBE", "METAL", "MODEL", "MONEY",
    "MONTH", "MOTOR", "MOUNT", "MOUSE", "MUSIC", "NERVE", "NIGHT", "NOISE",
    "NORTH", "NOVEL", "OCEAN", "OFFER", "ORDER", "OTHER", "PANEL", "PAPER",
    "PARTY", "PEACE", "PHONE", "PIANO", "PIECE", "PILOT", "PITCH", "PLACE",
    "PLAIN", "PLANE", "PLANT", "PLATE", "POINT", "POWER", "PRESS", "PRICE",
    "PRIDE", "PRINT", "PRIOR", "PRIZE", "PROOF", "QUEEN", "QUICK", "QUIET",
    "RADIO", "RANGE", "REACH", "READY", "RIVER", "ROUND", "ROUTE", "SCALE",
    "SCENE", "SCOPE", "SCORE", "SENSE", "SERVE", "SHAPE", "SHARE", "SHEET",
    "SHIFT", "SHINE", "SHORT", "SIGHT", "SKILL", "SLEEP", "SMALL", "SMART",
    "SMILE", "SOLID", "SOUND", "SOUTH", "SPACE", "SPEND", "SPORT", "STAGE",
    "STAND", "START", "STATE", "STICK", "STILL", "STONE", "STORE", "STORY",
    "STUDY", "STYLE", "SUGAR", "TABLE", "TEACH", "THEME", "THICK", "THING",
    "THINK", "THIRD", "THROW", "TIGHT", "TITLE", "TODAY", "TOPIC", "TOUCH",
    "TOWER", "TRACK", "TRADE", "TRAIL", "TRAIN", "TREND", "TRIAL", "TRUST",
    "TRUTH", "UNDER", "UNION", "VALUE", "VIDEO", "VISIT", "VOICE", "WATER",
    "WHEEL", "WHERE", "WHILE", "WHITE", "WHOLE", "WOMAN", "WORLD", "WRITE",
    "YOUNG",
    "ACCEPT", "ACROSS", "ACTION", "ACTIVE", "ADJUST", "ADVICE", "ALMOST",
    "ANIMAL", "ANSWER", "ANYONE", "AROUND", "ARTIST", "AUTHOR", "BATTLE",
    "BECOME", "BEFORE", "BETTER", "BORDER", "BOTTLE", "BOTTOM", "BRANCH",
    "BRIDGE", "BRIGHT", "BROKEN", "BUTTON", "CAMERA", "CANDLE", "CANNOT",
    "CATION", "CHANGE", "CHARGE", "CHOICE", "CHOOSE", "CHURCH", "CIRCLE",
    "CLIENT", "COFFEE", "COMMON", "CORNER", "COUNTY", "CREATE", "DANGER",
    "DEBATE", "DECADE", "DECIDE", "DEEPER", "DESIGN", "DETAIL", "DINNER",
    "DIRECT", "DOUBLE", "DRIVER", "EDITOR", "EFFECT", "EFFORT", "ENERGY",
    "ENGINE", "ENOUGH", "ESCAPE", "FAMILY", "FATHER", "FIGURE", "FILTER",
    "FINGER", "FINISH", "FLOWER", "FOLLOW", "FOREST", "FORMAL", "FRIEND",
    "FUTURE", "GARDEN", "GLOBAL", "GROUND", "GROWTH", "HANDLE", "HEALTH",
    "HEIGHT", "HIDDEN", "ISLAND", "LETTER", "LISTEN", "LITTLE", "MARKET",
    "MASTER", "MATTER", "MEMBER", "MEMORY", "METHOD", "MIDDLE", "MINUTE",
    "MOMENT", "MOTHER", "NATURE", "NOTICE", "NUMBER", "OBJECT", "OPTION",
    "ORANGE", "OUTPUT", "PALACE", "PARENT", "PEOPLE", "PERIOD", "PERSON",
    "PHRASE", "PLAYER", "POCKET", "POLICY", "PUBLIC", "PUZZLE", "RANDOM",
    "READER", "REASON", "RECORD", "RETURN", "SCHOOL", "SCREEN", "SEARCH",
    "SECOND", "SECRET", "SERIES", "SILVER", "SIMPLE", "SINGLE", "SISTER",
    "SOCIAL", "SOURCE", "SPEECH", "SPIRIT", "SPRING", "SQUARE", "STABLE",
    "STATUS", "STREET", "STRONG", "SUMMER", "SYSTEM", "TARGET", "THEORY",
    "THREAD", "TICKET", "TIMBER", "TRAVEL", "VALLEY", "VISION", "WINDOW",
    "WINNER", "WINTER", "WONDER", "YELLOW"
  )
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

constraint_names <- function(side_word, top_word) {
  c(paste0("R", seq_len(board_size), ":", strsplit(side_word, "", fixed = TRUE)[[1]]),
    paste0("C", seq_len(board_size), ":", strsplit(top_word, "", fixed = TRUE)[[1]]))
}

placement_cover <- function(cells, letters, side_letters, top_letters, names) {
  covered <- rep(FALSE, length(names))
  for (ii in seq_along(letters)) {
    row <- cells[ii, "row"]
    col <- cells[ii, "col"]
    letter <- letters[[ii]]
    if (letter == side_letters[[row]]) covered[row] <- TRUE
    if (letter == top_letters[[col]]) covered[board_size + col] <- TRUE
  }
  covered
}

candidate_placements <- function(dictionary, side_word, top_word, seed) {
  set.seed(seed)
  side_letters <- strsplit(side_word, "", fixed = TRUE)[[1]]
  top_letters <- strsplit(top_word, "", fixed = TRUE)[[1]]
  names <- constraint_names(side_word, top_word)
  placements <- list()

  for (length in unique(fleet_lengths)) {
    pool <- dictionary[[as.character(length)]]
    preferred_pool <- intersect(pool, preferred_ship_words())
    if (length(preferred_pool) >= 20) pool <- preferred_pool
    common_letters <- unique(c(side_letters, top_letters))
    pool <- pool[vapply(pool, function(word) any(strsplit(word, "", fixed = TRUE)[[1]] %in% common_letters), logical(1))]
    if (length(pool) > 1200) pool <- sample(pool, 1200)

    length_placements <- list()
    for (word in pool) {
      letters <- strsplit(word, "", fixed = TRUE)[[1]]
      for (direction in c("H", "V")) {
        max_row <- if (direction == "V") board_size - length + 1 else board_size
        max_col <- if (direction == "H") board_size - length + 1 else board_size
        for (row in seq_len(max_row)) {
          for (col in seq_len(max_col)) {
            cells <- placement_cells(row, col, direction, length)
            covered <- placement_cover(cells, letters, side_letters, top_letters, names)
            if (!any(covered)) next
            length_placements[[length(length_placements) + 1]] <- list(
              word = word,
              length = length,
              row = row,
              col = col,
              direction = direction,
              cells = (cells[, "col"] - 1) * board_size + cells[, "row"],
              covered = covered,
              score = sum(covered)
            )
          }
        }
      }
    }
    placements[[as.character(length)]] <- length_placements
  }
  placements
}

make_edge_first_board <- function(dictionary, side_word, top_word, seed) {
  set.seed(seed)
  placements <- candidate_placements(dictionary, side_word, top_word, seed)
  names <- constraint_names(side_word, top_word)

  for (attempt in seq_len(900)) {
    board <- empty_board()
    occupied <- rep(FALSE, board_size * board_size)
    covered <- rep(FALSE, length(names))
    ships <- list()
    used_words <- character()

    for (ship_index in seq_along(fleet_lengths)) {
      length <- fleet_lengths[[ship_index]]
      pool <- placements[[as.character(length)]]
      usable <- pool[vapply(pool, function(candidate) {
        !candidate$word %in% used_words && !any(occupied[candidate$cells])
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

make_puzzle <- function(date, id, seed, dictionary, edge_pairs, start_pair = 1, used_pair_keys = character()) {
  set.seed(seed)
  candidate <- NULL
  for (offset in seq_len(nrow(edge_pairs))) {
    pair_index <- ((start_pair + offset - 2) %% nrow(edge_pairs)) + 1
    side_word <- edge_pairs$side[[pair_index]]
    top_word <- edge_pairs$top[[pair_index]]
    if (paste(side_word, top_word, sep = "/") %in% used_pair_keys) next
    candidate <- make_edge_first_board(dictionary, side_word, top_word, seed + offset)
    if (!is.null(candidate)) break
  }
  if (is.null(candidate)) stop("Could not generate edge-first board for ", date)

  validation <- validate_candidate(candidate, dictionary)
  if (!validation$ok) stop("Generated board failed validation for ", date)

  masked <- mask_puzzle(candidate$board, candidate$top, candidate$side, seed)
  hidden_letters <- sum(candidate$board != "") - sum(masked$puzzle != "")
  hidden_edges <- sum(!masked$top_visible) + sum(!masked$side_visible)

  chosen_pair_key <- paste(candidate$side, candidate$top, sep = "/")

  list(
    id = id,
    date = date,
    size = board_size,
    fleetLengths = fleet_lengths,
    solution = matrix_to_rows(candidate$board),
    puzzle = matrix_to_rows(masked$puzzle),
    topWord = candidate$top,
    sideWord = candidate$side,
    topVisible = unname(masked$top_visible),
    sideVisible = unname(masked$side_visible),
    ships = candidate$ships,
    difficulty = list(
      label = "medium-hard",
      hiddenLetters = hidden_letters,
      hiddenEdges = hidden_edges,
      givenLetters = sum(masked$puzzle != "")
    ),
    validation = validation
  ) |>
    c(list(pairKey = chosen_pair_key))
}

write_batch <- function(start_date = "2026-05-03", days = 90, seed_base = 20260503) {
  dictionary <- read_dictionary()
  edge_words <- preferred_edge_words(dictionary)
  edge_pairs <- expand.grid(side = edge_words, top = edge_words, stringsAsFactors = FALSE)
  edge_pairs <- edge_pairs[edge_pairs$side != edge_pairs$top, ]
  set.seed(seed_base)
  edge_pairs <- edge_pairs[sample(seq_len(nrow(edge_pairs))), ]
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

  used_pair_keys <- character()
  for (ii in seq_along(dates)) {
    puzzle <- make_puzzle(
      date = dates[ii],
      id = sprintf("vocabble-%s", dates[ii]),
      seed = seed_base + ii,
      dictionary = dictionary,
      edge_pairs = edge_pairs,
      start_pair = ii,
      used_pair_keys = used_pair_keys
    )
    used_pair_keys <- c(used_pair_keys, puzzle$pairKey)
    puzzle$pairKey <- NULL

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
