#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(jsonlite)
})

`%||%` <- function(x, y) {
  if (is.null(x)) y else x
}

fleet_lengths <- c(6, 5, 4, 4, 3, 3)
board_size <- 8
generation_pool_cache <- new.env(parent = emptyenv())

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
    "ACE", "ACT", "AGE", "AIM", "AIR", "ANT", "ARM", "ART", "ASH", "ASK",
    "AXE", "BAG",
    "BAR", "BAT", "BAY", "BED", "BEE", "BOX", "BOY", "BUN", "BUS", "CAB",
    "BIZ", "BYE", "CAN", "CAP", "CAR", "CAT", "COW", "CUE", "CUP", "CUT",
    "DAY", "DEN", "DIG", "DOC", "DOG", "DOT", "DRY", "DUE", "DYE", "EGG",
    "ELF", "EMU", "EON", "EWE", "FAR", "FAT", "FEZ", "FIG", "FIN", "FLY",
    "FOX", "FUN", "GAS", "GNU", "GYM", "HAT", "HEN", "HER", "HOT", "ICE",
    "INK", "ION", "IVY", "JAM",
    "JAR", "JET", "KEY", "LAP", "LAW", "LEG", "LOG", "MAN", "MAP", "NET",
    "OAK", "OAR", "OIL", "PAN", "PEN", "PIE", "PIN", "POT", "RAG", "RAT",
    "RED", "ROW", "RUN", "SEA", "SET", "SKY", "SUN", "TAN", "TEA", "TEN",
    "TIN", "TOE", "TOP", "TOY", "USE", "VAN", "WAR", "WAX", "WAY", "WIN",
    "YES",
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

slot_stable_words <- function(pool, reference_pool = pool) {
  if (!length(pool)) return(pool)
  length <- nchar(pool[[1]])
  pool[vapply(pool, function(word) {
    letters <- strsplit(word, "", fixed = TRUE)[[1]]
    any(vapply(seq_len(length), function(index) {
      pattern <- letters
      pattern[[index]] <- ""
      sum(vapply(reference_pool, word_matches_pattern, logical(1), pattern = pattern)) == 1L
    }, logical(1)))
  }, logical(1))]
}

preferred_generation_pool <- function(dictionary, length) {
  cache_key <- as.character(length)
  if (exists(cache_key, envir = generation_pool_cache, inherits = FALSE)) {
    return(get(cache_key, envir = generation_pool_cache, inherits = FALSE))
  }
  pool <- dictionary[[as.character(length)]]
  if (length == 3) {
    out <- slot_stable_words(pool, pool)
    assign(cache_key, out, envir = generation_pool_cache)
    return(out)
  }
  preferred_pool <- intersect(pool, preferred_ship_words())
  if (length(preferred_pool) < 20) {
    assign(cache_key, pool, envir = generation_pool_cache)
    return(pool)
  }

  stable_preferred <- slot_stable_words(preferred_pool, pool)
  needed <- table(fleet_lengths)[[as.character(length)]] %||% 1L
  if (length(stable_preferred) >= needed) {
    assign(cache_key, stable_preferred, envir = generation_pool_cache)
    return(stable_preferred)
  }
  assign(cache_key, preferred_pool, envir = generation_pool_cache)
  preferred_pool
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

linear_cells <- function(cells) {
  (cells[, "col"] - 1) * board_size + cells[, "row"]
}

orthogonal_neighbor_cells <- function(cells) {
  own <- paste(cells[, "row"], cells[, "col"])
  out <- list()
  for (ii in seq_len(nrow(cells))) {
    adjacent <- neighbors4(cells[ii, "row"], cells[ii, "col"])
    if (!nrow(adjacent)) next
    adjacent <- adjacent[!paste(adjacent[, 1], adjacent[, 2]) %in% own, , drop = FALSE]
    if (nrow(adjacent)) out[[length(out) + 1]] <- adjacent
  }
  if (!length(out)) return(integer())
  unique(linear_cells(do.call(rbind, out)))
}

can_place <- function(board, row, col, direction, letters) {
  length <- length(letters)
  if (direction == "H" && col + length - 1 > board_size) return(FALSE)
  if (direction == "V" && row + length - 1 > board_size) return(FALSE)

  cells <- placement_cells(row, col, direction, length)
  if (any(board[cells] != "")) return(FALSE)
  neighbors <- orthogonal_neighbor_cells(cells)
  !length(neighbors) || !any(board[neighbors] != "")
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

candidate_placements <- function(dictionary,
                                 side_word,
                                 top_word,
                                 seed,
                                 prefer_common_words = TRUE,
                                 sample_limit = 1200,
                                 lengths = unique(fleet_lengths)) {
  set.seed(seed)
  side_letters <- strsplit(side_word, "", fixed = TRUE)[[1]]
  top_letters <- strsplit(top_word, "", fixed = TRUE)[[1]]
  names <- constraint_names(side_word, top_word)
  placements <- list()

  for (length in unique(lengths)) {
    pool <- dictionary[[as.character(length)]]
    if (prefer_common_words) {
      pool <- preferred_generation_pool(dictionary, length)
    }
    common_letters <- unique(c(side_letters, top_letters))
    pool <- pool[vapply(pool, function(word) any(strsplit(word, "", fixed = TRUE)[[1]] %in% common_letters), logical(1))]
    if (!is.null(sample_limit) && length(pool) > sample_limit) pool <- sample(pool, sample_limit)

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
              cells = linear_cells(cells),
              neighbors = orthogonal_neighbor_cells(cells),
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

  for (attempt in seq_len(70)) {
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

mask_puzzle <- function(board, top_word, side_word, ships, seed) {
  set.seed(seed)
  filled <- which(board != "")
  givens <- integer()

  for (ship in ships) {
    cells <- linear_cells(placement_cells(ship$row, ship$col, ship$direction, ship$length))
    needed <- if (ship$length <= 3) 2 else 1
    givens <- c(givens, sample(cells, needed))
  }
  remaining <- setdiff(filled, givens)
  target_givens <- min(length(filled), 14)
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

make_puzzle_object <- function(candidate, masked, id, date, validation = NULL, uniqueness = NULL) {
  hidden_letters <- sum(candidate$board != "") - sum(masked$puzzle != "")
  hidden_edges <- sum(!masked$top_visible) + sum(!masked$side_visible)
  validation <- validation %||% validate_candidate(candidate, read_dictionary())

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
    validation = validation,
    uniqueness = uniqueness
  )
}

full_clue_mask <- function(candidate) {
  list(
    puzzle = candidate$board,
    top_visible = rep(TRUE, board_size),
    side_visible = rep(TRUE, board_size)
  )
}

build_unique_clue_set <- function(candidate,
                                  dictionary,
                                  id,
                                  date,
                                  seed,
                                  target_total_givens = 20,
                                  min_total_givens = 6,
                                  min_ship_givens = 0,
                                  min_edge_visible = 4,
                                  max_total_givens = 20,
                                  extra_board_passes = 0,
                                  max_ship_givens = NULL,
                                  seconds_per_trial = 4) {
  set.seed(seed)
  validation <- validate_candidate(candidate, dictionary)
  placement_cache <- new.env(parent = emptyenv())
  masked <- full_clue_mask(candidate)
  current <- make_puzzle_object(candidate, masked, id, date, validation = validation)
  current_uniqueness <- word_removal_uniqueness(current, dictionary, placement_cache)
  if (!current_uniqueness$unique) return(NULL)

  filled_cells <- which(candidate$board != "")
  ship_cells <- lapply(candidate$ships, function(ship) {
    linear_cells(placement_cells(ship$row, ship$col, ship$direction, ship$length))
  })
  names(ship_cells) <- vapply(candidate$ships, `[[`, character(1), "word")
  clue_counts <- rep(0L, length(ship_cells))
  names(clue_counts) <- names(ship_cells)
  for (ii in seq_along(ship_cells)) clue_counts[[ii]] <- length(ship_cells[[ii]])
  ship_lengths <- vapply(candidate$ships, `[[`, numeric(1), "length")
  if (is.null(max_ship_givens)) {
    max_ship_givens <- ship_lengths
  }
  names(max_ship_givens) <- names(ship_cells)

  board_givens <- function() sum(masked$puzzle != "")

  try_remove_cell <- function(cell) {
    row <- ((cell - 1) %% board_size) + 1
    col <- ((cell - 1) %/% board_size) + 1
    if (masked$puzzle[row, col] == "") return(FALSE)

    ship_index <- which(vapply(ship_cells, function(cells) cell %in% cells, logical(1)))
    if (length(ship_index) && clue_counts[[ship_index]] <= min_ship_givens) return(FALSE)

    old_value <- masked$puzzle[row, col]
    masked$puzzle[row, col] <<- ""
    trial <- make_puzzle_object(candidate, masked, id, date, validation = validation)
    trial_uniqueness <- count_puzzle_solutions(
      trial,
      dictionary,
      limit = 2,
      cache = placement_cache,
      deadline = proc.time()[["elapsed"]] + seconds_per_trial
    )
    if (trial_uniqueness$count == 1 && !isTRUE(trial_uniqueness$timedOut)) {
      current_uniqueness <<- trial_uniqueness
      if (length(ship_index)) clue_counts[[ship_index]] <<- clue_counts[[ship_index]] - 1L
      TRUE
    } else {
      masked$puzzle[row, col] <<- old_value
      FALSE
    }
  }

  # First remove from over-exposed ships. Otherwise the greedy search can leave
  # one complete ship visible and still call the puzzle "hard" by metadata.
  repeat {
    overexposed <- which(clue_counts > max_ship_givens)
    if (!length(overexposed)) break
    removable <- unique(unlist(ship_cells[overexposed], use.names = FALSE))
    removed_any <- FALSE
    for (cell in sample(removable)) {
      if (try_remove_cell(cell)) removed_any <- TRUE
    }
    if (!removed_any) break
  }
  if (any(clue_counts > max_ship_givens)) return(NULL)

  for (cell in sample(filled_cells)) {
    if (board_givens() <= target_total_givens) break
    try_remove_cell(cell)
  }

  # A second pass catches clues that were necessary before other removals but
  # become redundant after the board has been made sparser.
  for (cell in sample(filled_cells)) {
    if (board_givens() <= target_total_givens) break
    try_remove_cell(cell)
  }

  # After reaching the old floor, make a bounded minimization pass over the
  # remaining clues. This avoids falsely treating the floor as evidence that no
  # more letters can be removed, while keeping batch generation tractable.
  if (extra_board_passes > 0) {
    for (pass in seq_len(extra_board_passes)) {
      removed_any <- FALSE
      remaining <- filled_cells[masked$puzzle[filled_cells] != ""]
      if (!length(remaining) || board_givens() <= min_total_givens) break
      for (cell in sample(remaining)) {
        if (board_givens() <= min_total_givens) break
        if (try_remove_cell(cell)) removed_any <- TRUE
      }
      if (!removed_any) break
    }
  }

  edge_attempts <- c(
    paste0("top:", sample(seq_len(board_size))),
    paste0("side:", sample(seq_len(board_size)))
  )
  edge_attempts <- sample(edge_attempts)
  for (edge in edge_attempts) {
    parts <- strsplit(edge, ":", fixed = TRUE)[[1]]
    axis <- parts[[1]]
    index <- as.integer(parts[[2]])
    if (axis == "top") {
      if (sum(masked$top_visible) <= min_edge_visible || !masked$top_visible[[index]]) next
      masked$top_visible[[index]] <- FALSE
    } else {
      if (sum(masked$side_visible) <= min_edge_visible || !masked$side_visible[[index]]) next
      masked$side_visible[[index]] <- FALSE
    }

    trial <- make_puzzle_object(candidate, masked, id, date, validation = validation)
    trial_uniqueness <- count_puzzle_solutions(
      trial,
      dictionary,
      limit = 2,
      cache = placement_cache,
      deadline = proc.time()[["elapsed"]] + seconds_per_trial
    )
    if (trial_uniqueness$count == 1 && !isTRUE(trial_uniqueness$timedOut)) {
      current_uniqueness <- trial_uniqueness
    } else if (axis == "top") {
      masked$top_visible[[index]] <- TRUE
    } else {
      masked$side_visible[[index]] <- TRUE
    }
  }

  if (extra_board_passes > 0) {
    for (cell in sample(filled_cells)) {
      if (board_givens() <= min_total_givens) break
      try_remove_cell(cell)
    }
  }

  final_uniqueness <- word_removal_uniqueness(
    make_puzzle_object(candidate, masked, id, date, validation = validation),
    dictionary,
    placement_cache
  )

  final_puzzle <- make_puzzle_object(
    candidate,
    masked,
    id,
    date,
    validation = validation,
    uniqueness = list(
      method = "word-removal backtracking",
      unique = final_uniqueness$unique,
      solutionWords = final_uniqueness$solutionWords
    )
  )
  if (!isTRUE(final_puzzle$uniqueness$unique)) return(NULL)
  if (final_puzzle$difficulty$givenLetters > max_total_givens) return(NULL)
  final_puzzle
}

stable_hidden_position <- function(word, dictionary) {
  letters <- strsplit(word, "", fixed = TRUE)[[1]]
  pool <- dictionary[[as.character(length(letters))]]
  candidates <- which(vapply(seq_along(letters), function(index) {
    pattern <- letters
    pattern[[index]] <- ""
    sum(vapply(pool, word_matches_pattern, logical(1), pattern = pattern)) == 1L
  }, logical(1)))
  if (!length(candidates)) return(NA_integer_)
  candidates[[1]]
}

build_dense_no_full_clue_set <- function(candidate, dictionary, id, date, seed) {
  set.seed(seed)
  validation <- validate_candidate(candidate, dictionary)
  if (!validation$ok) return(NULL)

  masked <- full_clue_mask(candidate)
  for (ship in candidate$ships) {
    hidden_position <- stable_hidden_position(ship$word, dictionary)
    if (is.na(hidden_position)) return(NULL)
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    masked$puzzle[cells[hidden_position, "row"], cells[hidden_position, "col"]] <- ""
  }

  placement_cache <- new.env(parent = emptyenv())
  current <- make_puzzle_object(candidate, masked, id, date, validation = validation)
  current_uniqueness <- count_puzzle_solutions(
    current,
    dictionary,
    limit = 2,
    cache = placement_cache,
    deadline = proc.time()[["elapsed"]] + 2
  )
  if (current_uniqueness$count != 1 || isTRUE(current_uniqueness$timedOut)) return(NULL)

  edge_attempts <- sample(c(
    paste0("top:", seq_len(board_size)),
    paste0("side:", seq_len(board_size))
  ))
  for (edge in edge_attempts) {
    parts <- strsplit(edge, ":", fixed = TRUE)[[1]]
    axis <- parts[[1]]
    index <- as.integer(parts[[2]])
    if (axis == "top") {
      if (sum(masked$top_visible) <= 4 || !masked$top_visible[[index]]) next
      masked$top_visible[[index]] <- FALSE
    } else {
      if (sum(masked$side_visible) <= 4 || !masked$side_visible[[index]]) next
      masked$side_visible[[index]] <- FALSE
    }

    trial <- make_puzzle_object(candidate, masked, id, date, validation = validation)
    trial_uniqueness <- count_puzzle_solutions(
      trial,
      dictionary,
      limit = 2,
      cache = placement_cache,
      deadline = proc.time()[["elapsed"]] + 4
    )
    if (trial_uniqueness$count == 1 && !isTRUE(trial_uniqueness$timedOut)) {
      current_uniqueness <- trial_uniqueness
    } else if (axis == "top") {
      masked$top_visible[[index]] <- TRUE
    } else {
      masked$side_visible[[index]] <- TRUE
    }
  }

  final_puzzle <- make_puzzle_object(
    candidate,
    masked,
    id,
    date,
    validation = validation,
    uniqueness = list(
      method = "word-removal backtracking",
      unique = TRUE,
      solutionWords = current_uniqueness$solutionWords
    )
  )
  if (has_fully_clued_ship(final_puzzle)) return(NULL)
  if (disambiguate_same_slot_words(final_puzzle, dictionary)$difficulty$givenLetters != final_puzzle$difficulty$givenLetters) return(NULL)
  final_puzzle
}

refresh_puzzle_clues <- function(puzzle, puzzle_board, top_visible, side_visible, uniqueness = NULL) {
  solution_board <- puzzle_matrix(puzzle$solution)
  puzzle$puzzle <- matrix_to_rows(puzzle_board)
  puzzle$topVisible <- unname(top_visible)
  puzzle$sideVisible <- unname(side_visible)
  puzzle$difficulty$hiddenLetters <- sum(solution_board != "") - sum(puzzle_board != "")
  puzzle$difficulty$hiddenEdges <- sum(!top_visible) + sum(!side_visible)
  puzzle$difficulty$givenLetters <- sum(puzzle_board != "")
  if (!is.null(uniqueness)) {
    solution_words <- uniqueness$solutionWords
    if (is.list(solution_words)) solution_words <- solution_words[[1]] %||% character()
    puzzle$uniqueness <- list(
      method = "word-removal backtracking",
      unique = uniqueness$unique,
      solutionWords = solution_words
    )
  }
  puzzle
}

edge_constraints_ok <- function(board, side_word, top_word) {
  row_sets <- apply(board, 1, function(x) unique(x[x != ""]))
  col_sets <- apply(board, 2, function(x) unique(x[x != ""]))
  side_letters <- strsplit(side_word, "", fixed = TRUE)[[1]]
  top_letters <- strsplit(top_word, "", fixed = TRUE)[[1]]
  all(mapply(`%in%`, side_letters, row_sets)) &&
    all(mapply(`%in%`, top_letters, col_sets))
}

disambiguate_same_slot_words <- function(puzzle, dictionary) {
  solution_board <- puzzle_matrix(puzzle$solution)
  puzzle_board <- puzzle_matrix(puzzle$puzzle)

  for (ship in puzzle$ships) {
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    solution_letters <- solution_board[cells]
    solution_word <- paste0(solution_letters, collapse = "")
    pool <- dictionary[[as.character(ship$length)]]

    repeat {
      pattern <- puzzle_board[cells]
      candidates <- pool[vapply(pool, function(word) {
        if (word == solution_word) return(FALSE)
        letters <- strsplit(word, "", fixed = TRUE)[[1]]
        if (any(pattern != "" & pattern != letters)) return(FALSE)
        trial_board <- solution_board
        trial_board[cells] <- letters
        edge_constraints_ok(trial_board, puzzle$sideWord, puzzle$topWord)
      }, logical(1))]
      if (!length(candidates)) break

      hidden_positions <- which(pattern == "")
      if (!length(hidden_positions)) break
      candidate_letters <- lapply(candidates, strsplit, "", fixed = TRUE)
      candidate_letters <- lapply(candidate_letters, `[[`, 1)
      scores <- vapply(hidden_positions, function(position) {
        sum(vapply(candidate_letters, function(letters) letters[[position]] == solution_letters[[position]], logical(1)))
      }, integer(1))
      clue_position <- hidden_positions[[which.min(scores)]]
      puzzle_board[cells[clue_position, "row"], cells[clue_position, "col"]] <- solution_letters[[clue_position]]
    }
  }

  refresh_puzzle_clues(puzzle, puzzle_board, unlist(puzzle$topVisible), unlist(puzzle$sideVisible), puzzle$uniqueness)
}

ship_given_counts <- function(puzzle) {
  puzzle_board <- puzzle_matrix(puzzle$puzzle)
  vapply(puzzle$ships, function(ship) {
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    sum(puzzle_board[cells] != "")
  }, integer(1))
}

has_fully_clued_ship <- function(puzzle) {
  counts <- ship_given_counts(puzzle)
  lengths <- vapply(puzzle$ships, `[[`, numeric(1), "length")
  any(counts >= lengths)
}

remove_fully_clued_ship_givens <- function(puzzle,
                                           dictionary,
                                           seed,
                                           seconds_per_trial = 12) {
  set.seed(seed)
  puzzle_board <- puzzle_matrix(puzzle$puzzle)
  placement_cache <- new.env(parent = emptyenv())

  for (ship_index in sample(seq_along(puzzle$ships))) {
    ship <- puzzle$ships[[ship_index]]
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    if (sum(puzzle_board[cells] != "") < ship$length) next

    for (position in sample(seq_len(nrow(cells)))) {
      row <- cells[position, "row"]
      col <- cells[position, "col"]
      old_value <- puzzle_board[row, col]
      if (old_value == "") next

      puzzle_board[row, col] <- ""
      trial <- refresh_puzzle_clues(
        puzzle,
        puzzle_board,
        unlist(puzzle$topVisible),
        unlist(puzzle$sideVisible)
      )
      result <- count_puzzle_solutions(
        trial,
        dictionary,
        limit = 2,
        cache = placement_cache,
        deadline = proc.time()[["elapsed"]] + seconds_per_trial
      )
      if (result$count == 1 && !isTRUE(result$timedOut)) {
        puzzle <- refresh_puzzle_clues(
          trial,
          puzzle_board,
          unlist(trial$topVisible),
          unlist(trial$sideVisible),
          list(unique = TRUE, solutionWords = result$solutionWords)
        )
        break
      }
      puzzle_board[row, col] <- old_value
    }
  }

  puzzle
}

minimize_puzzle_clues <- function(puzzle,
                                  dictionary,
                                  seed,
                                  min_total_givens = 8,
                                  min_edge_visible = 4,
                                  board_passes = 1,
                                  edge_passes = 0,
                                  seconds_per_trial = 2) {
  set.seed(seed)
  original <- puzzle
  placement_cache <- new.env(parent = emptyenv())
  puzzle_board <- puzzle_matrix(puzzle$puzzle)
  top_visible <- unlist(puzzle$topVisible)
  side_visible <- unlist(puzzle$sideVisible)
  current_uniqueness <- list(
    unique = isTRUE(puzzle$uniqueness$unique),
    solutionWords = puzzle$uniqueness$solutionWords %||% character()
  )
  board_givens <- function() sum(puzzle_board != "")

  candidate_puzzle <- function() {
    refresh_puzzle_clues(puzzle, puzzle_board, top_visible, side_visible)
  }

  try_remove_board <- function(cell) {
    if (board_givens() <= min_total_givens) return(FALSE)
    row <- ((cell - 1) %% board_size) + 1
    col <- ((cell - 1) %/% board_size) + 1
    if (puzzle_board[row, col] == "") return(FALSE)

    old_value <- puzzle_board[row, col]
    puzzle_board[row, col] <<- ""
    trial <- candidate_puzzle()
    deadline <- proc.time()[["elapsed"]] + seconds_per_trial
    trial_uniqueness <- count_puzzle_solutions(trial, dictionary, limit = 2, cache = placement_cache, deadline = deadline)
    if (trial_uniqueness$count == 1 && !isTRUE(trial_uniqueness$timedOut)) {
      current_uniqueness <<- list(unique = TRUE, solutionWords = trial_uniqueness$solutionWords)
      TRUE
    } else {
      puzzle_board[row, col] <<- old_value
      FALSE
    }
  }

  try_remove_edge <- function(axis, index) {
    if (axis == "top") {
      if (sum(top_visible) <= min_edge_visible || !top_visible[[index]]) return(FALSE)
      top_visible[[index]] <<- FALSE
    } else {
      if (sum(side_visible) <= min_edge_visible || !side_visible[[index]]) return(FALSE)
      side_visible[[index]] <<- FALSE
    }

    trial <- candidate_puzzle()
    deadline <- proc.time()[["elapsed"]] + seconds_per_trial
    trial_uniqueness <- count_puzzle_solutions(trial, dictionary, limit = 2, cache = placement_cache, deadline = deadline)
    if (trial_uniqueness$count == 1 && !isTRUE(trial_uniqueness$timedOut)) {
      current_uniqueness <<- list(unique = TRUE, solutionWords = trial_uniqueness$solutionWords)
      TRUE
    } else {
      if (axis == "top") top_visible[[index]] <<- TRUE else side_visible[[index]] <<- TRUE
      FALSE
    }
  }

  for (pass in seq_len(board_passes)) {
    visible_cells <- which(puzzle_board != "")
    if (!length(visible_cells)) break
    removed_any <- FALSE
    for (cell in sample(visible_cells)) {
      if (try_remove_board(cell)) removed_any <- TRUE
    }
    if (!removed_any) break
  }

  for (pass in seq_len(edge_passes)) {
    edge_attempts <- sample(c(
      paste0("top:", seq_len(board_size)),
      paste0("side:", seq_len(board_size))
    ))
    removed_any <- FALSE
    for (edge in edge_attempts) {
      parts <- strsplit(edge, ":", fixed = TRUE)[[1]]
      if (try_remove_edge(parts[[1]], as.integer(parts[[2]]))) removed_any <- TRUE
    }
    if (!removed_any) break
  }

  minimized <- disambiguate_same_slot_words(candidate_puzzle(), dictionary)
  minimized <- remove_fully_clued_ship_givens(minimized, dictionary, seed = seed + 1L, seconds_per_trial = seconds_per_trial)
  if (!isTRUE(current_uniqueness$unique)) return(original)
  refresh_puzzle_clues(
    minimized,
    puzzle_matrix(minimized$puzzle),
    unlist(minimized$topVisible),
    unlist(minimized$sideVisible),
    current_uniqueness
  )
}

validate_candidate <- function(candidate, dictionary) {
  board <- candidate$board
  words <- c(vapply(candidate$ships, `[[`, character(1), "word"), candidate$side, candidate$top)
  ship_lengths <- vapply(candidate$ships, `[[`, numeric(1), "length")
  lengths_ok <- length(ship_lengths) == length(fleet_lengths) && identical(sort(ship_lengths), sort(fleet_lengths))
  dictionary_ok <- all(words %in% unlist(dictionary, use.names = FALSE))
  row_sets <- apply(board, 1, function(x) unique(x[x != ""]))
  col_sets <- apply(board, 2, function(x) unique(x[x != ""]))
  row_ok <- all(mapply(`%in%`, strsplit(candidate$side, "", fixed = TRUE)[[1]], row_sets))
  col_ok <- all(mapply(`%in%`, strsplit(candidate$top, "", fixed = TRUE)[[1]], col_sets))
  no_touch <- validate_no_orthogonal_touch(candidate$ships)
  list(
    ok = all(lengths_ok, dictionary_ok, row_ok, col_ok, no_touch, sum(board != "") == sum(fleet_lengths)),
    dictionary_ok = dictionary_ok,
    row_edge_ok = row_ok,
    col_edge_ok = col_ok,
    no_orthogonal_touch = no_touch
  )
}

validate_no_orthogonal_touch <- function(ships) {
  occupied_by_ship <- list()
  for (ii in seq_along(ships)) {
    ship <- ships[[ii]]
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    occupied_by_ship[[ii]] <- linear_cells(cells)
  }
  all_occupied <- unlist(occupied_by_ship, use.names = FALSE)
  if (anyDuplicated(all_occupied)) return(FALSE)
  for (ii in seq_along(ships)) {
    ship <- ships[[ii]]
    cells <- placement_cells(ship$row, ship$col, ship$direction, ship$length)
    neighbors <- orthogonal_neighbor_cells(cells)
    other_occupied <- setdiff(all_occupied, occupied_by_ship[[ii]])
    if (length(intersect(neighbors, other_occupied))) return(FALSE)
  }
  TRUE
}

solver_ship_pool <- function(dictionary, length) {
  pool <- dictionary[[as.character(length)]]
  preferred_pool <- intersect(pool, preferred_ship_words())
  if (length(preferred_pool) >= 20) preferred_pool else pool
}

word_matches_pattern <- function(word, pattern) {
  letters <- strsplit(word, "", fixed = TRUE)[[1]]
  all(pattern == "" | letters == pattern)
}

edge_candidates_from_pattern <- function(edge_words, word, visible) {
  pattern <- ifelse(visible, strsplit(word, "", fixed = TRUE)[[1]], "")
  edge_words[vapply(edge_words, word_matches_pattern, logical(1), pattern = pattern)]
}

puzzle_matrix <- function(rows) {
  out <- do.call(rbind, rows)
  storage.mode(out) <- "character"
  out
}

solver_placements <- function(dictionary, puzzle_board, side_candidates, top_candidates) {
  side_allowed <- lapply(seq_len(board_size), function(ii) unique(substr(side_candidates, ii, ii)))
  top_allowed <- lapply(seq_len(board_size), function(ii) unique(substr(top_candidates, ii, ii)))
  placements <- list()

  for (length in unique(fleet_lengths)) {
    pool <- solver_ship_pool(dictionary, length)
    length_placements <- list()
    next_id <- 1L

    for (word in pool) {
      letters <- strsplit(word, "", fixed = TRUE)[[1]]
      for (direction in c("H", "V")) {
        max_row <- if (direction == "V") board_size - length + 1 else board_size
        max_col <- if (direction == "H") board_size - length + 1 else board_size
        for (row in seq_len(max_row)) {
          for (col in seq_len(max_col)) {
            cells <- placement_cells(row, col, direction, length)
            existing <- puzzle_board[cells]
            if (any(existing != "" & existing != letters)) next

            contributes_edge <- FALSE
            for (ii in seq_along(letters)) {
              if (letters[[ii]] %in% side_allowed[[cells[ii, "row"]]] ||
                  letters[[ii]] %in% top_allowed[[cells[ii, "col"]]]) {
                contributes_edge <- TRUE
                break
              }
            }
            if (!contributes_edge) next

            length_placements[[length(length_placements) + 1]] <- list(
              id = next_id,
              word = word,
              length = length,
              row = row,
              col = col,
              direction = direction,
              letters = letters,
              cells = linear_cells(cells),
              neighbors = orthogonal_neighbor_cells(cells)
            )
            next_id <- next_id + 1L
          }
        }
      }
    }
    placements[[as.character(length)]] <- length_placements
  }
  placements
}

selected_board <- function(selected) {
  board <- empty_board()
  for (placement in selected) {
    letters <- placement$letters %||% strsplit(placement$word, "", fixed = TRUE)[[1]]
    board[placement$cells] <- letters
  }
  board
}

board_solution_key <- function(board, side_word, top_word) {
  paste(c(apply(board, 1, paste0, collapse = ""), side_word, top_word), collapse = "|")
}

edge_words_for_board <- function(board, side_candidates, top_candidates) {
  row_sets <- apply(board, 1, function(x) unique(x[x != ""]))
  col_sets <- apply(board, 2, function(x) unique(x[x != ""]))
  side_matches <- side_candidates[
    vapply(side_candidates, function(word) {
      all(mapply(`%in%`, strsplit(word, "", fixed = TRUE)[[1]], row_sets))
    }, logical(1))
  ]
  top_matches <- top_candidates[
    vapply(top_candidates, function(word) {
      all(mapply(`%in%`, strsplit(word, "", fixed = TRUE)[[1]], col_sets))
    }, logical(1))
  ]
  list(side = side_matches, top = top_matches)
}

placement_fits_puzzle <- function(placement, puzzle_board) {
  letters <- strsplit(placement$word, "", fixed = TRUE)[[1]]
  existing <- puzzle_board[placement$cells]
  !any(existing != "" & existing != letters)
}

placement_cache_key <- function(side_word, top_word) {
  paste(side_word, top_word, sep = "/")
}

cached_candidate_placements <- function(dictionary, side_word, top_word, cache = NULL, full_dictionary_lengths = 3) {
  if (is.null(cache)) {
    placements <- candidate_placements(dictionary, side_word, top_word, seed = 1)
    full_cache <- NULL
  } else {
    key <- placement_cache_key(side_word, top_word)
    if (!exists(key, envir = cache, inherits = FALSE)) {
      assign(key, candidate_placements(dictionary, side_word, top_word, seed = 1), envir = cache)
    }
    placements <- get(key, envir = cache, inherits = FALSE)
    full_cache <- paste0(key, "/full/", paste(full_dictionary_lengths, collapse = ","))
  }

  if (length(full_dictionary_lengths)) {
    if (!is.null(full_cache) && exists(full_cache, envir = cache, inherits = FALSE)) {
      full <- get(full_cache, envir = cache, inherits = FALSE)
    } else {
      full <- candidate_placements(
        dictionary,
        side_word,
        top_word,
        seed = 1,
        prefer_common_words = FALSE,
        sample_limit = NULL,
        lengths = full_dictionary_lengths
      )
      if (!is.null(full_cache)) assign(full_cache, full, envir = cache)
    }
    for (length in intersect(as.character(full_dictionary_lengths), names(full))) {
      placements[[length]] <- full[[length]]
    }
  }
  placements
}

count_fixed_edge_solutions <- function(puzzle_board,
                                       dictionary,
                                       side_word,
                                       top_word,
                                       limit = 2,
                                       cache = NULL,
                                       excluded_words = character(),
                                       deadline = Inf) {
  placements <- cached_candidate_placements(dictionary, side_word, top_word, cache)
  given_cells <- which(puzzle_board != "")
  solutions <- character()
  examples <- character()
  solution_words <- list()
  timed_out <- FALSE

  for (length in names(placements)) {
    placements[[length]] <- placements[[length]][
      !vapply(placements[[length]], function(candidate) candidate$word %in% excluded_words, logical(1))
    ]
    placements[[length]] <- placements[[length]][
      vapply(placements[[length]], placement_fits_puzzle, logical(1), puzzle_board = puzzle_board)
    ]
    if (length(placements[[length]])) {
      scores <- vapply(placements[[length]], function(candidate) {
        50 * sum(candidate$cells %in% given_cells) + sum(candidate$covered)
      }, numeric(1))
      placements[[length]] <- placements[[length]][order(scores, decreasing = TRUE)]
      for (ii in seq_along(placements[[length]])) placements[[length]][[ii]]$id <- ii
    }
  }

  feasible_candidates <- function(length, occupied, blocked, used_words, last_ids, enforce_order = TRUE) {
    candidates <- placements[[as.character(length)]]
    candidates[vapply(candidates, function(candidate) {
      !candidate$word %in% used_words &&
        !any(candidate$cells %in% occupied) &&
        !any(candidate$cells %in% blocked)
    }, logical(1))]
  }

  can_still_finish <- function(remaining_lengths, occupied, blocked, used_words, last_ids, covered_edges) {
    if (!length(remaining_lengths)) return(TRUE)
    possible_cells <- integer()
    possible_edges <- covered_edges
    for (future_length in unique(remaining_lengths)) {
      candidates <- feasible_candidates(future_length, occupied, blocked, used_words, last_ids, enforce_order = FALSE)
      if (!length(candidates)) return(FALSE)
      possible_cells <- unique(c(possible_cells, unlist(lapply(candidates, `[[`, "cells"), use.names = FALSE)))
      for (candidate in candidates) possible_edges <- possible_edges | candidate$covered
    }
    all(covered_edges | possible_edges) &&
      (!length(given_cells) || all(given_cells %in% c(occupied, possible_cells)))
  }

  all_feasible_candidates <- function(remaining_lengths, occupied, blocked, used_words, last_ids) {
    out <- list()
    for (length in unique(remaining_lengths)) {
      candidates <- feasible_candidates(length, occupied, blocked, used_words, last_ids)
      if (length(candidates)) out <- c(out, candidates)
    }
    out
  }

  choose_next_candidates <- function(remaining_lengths, occupied, blocked, used_words, last_ids, covered_edges) {
    all_candidates <- all_feasible_candidates(remaining_lengths, occupied, blocked, used_words, last_ids)
    if (!length(all_candidates)) return(list())

    constraints <- list()
    for (cell in setdiff(given_cells, occupied)) {
      constraints[[length(constraints) + 1]] <- list(
        count = sum(vapply(all_candidates, function(candidate) cell %in% candidate$cells, logical(1))),
        keep = function(candidate, target = cell) target %in% candidate$cells
      )
    }
    for (edge_index in which(!covered_edges)) {
      constraints[[length(constraints) + 1]] <- list(
        count = sum(vapply(all_candidates, function(candidate) candidate$covered[[edge_index]], logical(1))),
        keep = function(candidate, target = edge_index) candidate$covered[[target]]
      )
    }

    if (!length(constraints)) {
      options <- unique(remaining_lengths)
      counts <- vapply(options, function(length) {
        length(feasible_candidates(length, occupied, blocked, used_words, last_ids))
      }, integer(1))
      return(feasible_candidates(options[[which.min(counts)]], occupied, blocked, used_words, last_ids))
    }

    counts <- vapply(constraints, `[[`, integer(1), "count")
    if (any(counts == 0L)) return(list())
    chosen <- constraints[[which.min(counts)]]
    all_candidates[vapply(all_candidates, chosen$keep, logical(1))]
  }

  remove_one_length <- function(remaining_lengths, length) {
    remaining_lengths[-match(length, remaining_lengths)]
  }

  record_solution <- function(selected) {
    board <- selected_board(selected)
    key <- board_solution_key(board, side_word, top_word)
    if (!key %in% solutions) {
      solutions <<- c(solutions, key)
      ship_words <- vapply(selected, `[[`, character(1), "word")
      examples <<- c(examples, paste(side_word, top_word, paste(ship_words, collapse = ","), sep = " / "))
      solution_words[[length(solution_words) + 1]] <<- c(side_word, top_word, ship_words)
    }
  }

  search <- function(remaining_lengths, occupied, blocked, used_words, selected, covered_edges, last_ids) {
    if (length(solutions) >= limit) return()
    if (proc.time()[["elapsed"]] > deadline) {
      timed_out <<- TRUE
      return()
    }

    if (!length(remaining_lengths)) {
      if (length(given_cells) && !all(given_cells %in% occupied)) return()
      if (!all(covered_edges)) return()
      record_solution(selected)
      return()
    }

    if (!can_still_finish(remaining_lengths, occupied, blocked, used_words, last_ids, covered_edges)) return()
    candidates <- choose_next_candidates(remaining_lengths, occupied, blocked, used_words, last_ids, covered_edges)
    if (!length(candidates)) return()

    if (length(remaining_lengths) == 1L) {
      for (candidate in candidates) {
        next_occupied <- unique(c(occupied, candidate$cells))
        next_covered_edges <- covered_edges | candidate$covered
        if (length(given_cells) && !all(given_cells %in% next_occupied)) next
        if (!all(next_covered_edges)) next
        record_solution(c(selected, list(candidate)))
        if (length(solutions) >= limit) return()
      }
      return()
    }

    for (candidate in candidates) {
      if (timed_out) return()
      next_last_ids <- last_ids
      next_last_ids[[as.character(candidate$length)]] <- candidate$id
      search(
        remove_one_length(remaining_lengths, candidate$length),
        unique(c(occupied, candidate$cells)),
        unique(c(blocked, candidate$neighbors)),
        c(used_words, candidate$word),
        c(selected, list(candidate)),
        covered_edges | candidate$covered,
        next_last_ids
      )
      if (length(solutions) >= limit) return()
    }
  }

  search(fleet_lengths, integer(), integer(), character(), list(), rep(FALSE, board_size * 2), list())
  list(count = length(solutions), examples = examples, solutionWords = solution_words, timedOut = timed_out)
}

count_puzzle_solutions <- function(puzzle, dictionary, limit = 2, cache = NULL, excluded_words = character(), deadline = Inf) {
  puzzle_board <- puzzle_matrix(puzzle$puzzle)
  edge_words <- setdiff(preferred_edge_words(dictionary), excluded_words)
  side_candidates <- edge_candidates_from_pattern(edge_words, puzzle$sideWord, unlist(puzzle$sideVisible))
  top_candidates <- edge_candidates_from_pattern(edge_words, puzzle$topWord, unlist(puzzle$topVisible))
  if (!length(side_candidates) || !length(top_candidates)) {
    return(list(count = 0L, examples = character(), sideCandidates = length(side_candidates), topCandidates = length(top_candidates), timedOut = FALSE))
  }

  count <- 0L
  examples <- character()
  solution_words <- list()
  for (side_word in side_candidates) {
    for (top_word in top_candidates) {
      if (proc.time()[["elapsed"]] > deadline) {
        return(list(
          count = limit,
          examples = examples,
          solutionWords = solution_words,
          sideCandidates = length(side_candidates),
          topCandidates = length(top_candidates),
          timedOut = TRUE
        ))
      }
      result <- count_fixed_edge_solutions(
        puzzle_board,
        dictionary,
        side_word,
        top_word,
        limit = limit - count,
        cache = cache,
        excluded_words = excluded_words,
        deadline = deadline
      )
      if (isTRUE(result$timedOut)) {
        return(list(
          count = limit,
          examples = examples,
          solutionWords = solution_words,
          sideCandidates = length(side_candidates),
          topCandidates = length(top_candidates),
          timedOut = TRUE
        ))
      }
      count <- count + result$count
      examples <- c(examples, result$examples)
      solution_words <- c(solution_words, result$solutionWords)
      if (count >= limit) {
        return(list(
          count = count,
          examples = examples,
          solutionWords = solution_words,
          sideCandidates = length(side_candidates),
          topCandidates = length(top_candidates),
          timedOut = FALSE
        ))
      }
    }
  }

  list(
    count = count,
    examples = examples,
    solutionWords = solution_words,
    sideCandidates = length(side_candidates),
    topCandidates = length(top_candidates),
    timedOut = FALSE
  )
}

dictionary_without_words <- function(dictionary, words) {
  lapply(dictionary, function(pool) setdiff(pool, words))
}

word_removal_uniqueness <- function(puzzle, dictionary, placement_cache = NULL) {
  if (is.null(placement_cache)) placement_cache <- new.env(parent = emptyenv())
  first_solution <- count_puzzle_solutions(puzzle, dictionary, limit = 1, cache = placement_cache)
  if (first_solution$count != 1 || !length(first_solution$solutionWords)) {
    return(list(
      unique = FALSE,
      reason = "no initial solution",
      solutionWords = character(),
      alternatives = list()
    ))
  }

  solution_words <- unique(first_solution$solutionWords[[1]])
  alternatives <- list()
  for (word in solution_words) {
    alternate <- count_puzzle_solutions(
      puzzle,
      dictionary,
      limit = 1,
      cache = placement_cache,
      excluded_words = word
    )
    if (alternate$count > 0) {
      alternatives[[length(alternatives) + 1]] <- list(
        removedWord = word,
        example = alternate$examples[[1]] %||% ""
      )
    }
  }

  list(
    unique = !length(alternatives),
    reason = if (length(alternatives)) "alternative after removing solution word" else "unique by word removal",
    solutionWords = solution_words,
    alternatives = alternatives
  )
}

matrix_to_rows <- function(board) {
  unname(lapply(seq_len(nrow(board)), function(ii) unname(as.character(board[ii, ]))))
}

make_puzzle <- function(date, id, seed, dictionary, edge_pairs, start_pair = 1, used_pair_keys = character()) {
  set.seed(seed)
  accepted <- NULL
  chosen_pair_key <- NULL
  for (offset in seq_len(nrow(edge_pairs))) {
    pair_index <- ((start_pair + offset - 2) %% nrow(edge_pairs)) + 1
    side_word <- edge_pairs$side[[pair_index]]
    top_word <- edge_pairs$top[[pair_index]]
    if (paste(side_word, top_word, sep = "/") %in% used_pair_keys) next
    candidate <- make_edge_first_board(dictionary, side_word, top_word, seed + offset)
    if (is.null(candidate)) next

    validation <- validate_candidate(candidate, dictionary)
    if (!validation$ok) next

    accepted <- build_unique_clue_set(
      candidate = candidate,
      dictionary = dictionary,
      id = id,
      date = date,
      seed = seed + offset
    )
    if (!is.null(accepted)) {
      chosen_pair_key <- paste(candidate$side, candidate$top, sep = "/")
      accepted <- minimize_puzzle_clues(
        accepted,
        dictionary = dictionary,
        seed = seed + offset + 100000
      )
      break
    }
  }
  if (is.null(accepted)) stop("Could not generate uniquely solvable board for ", date)
  accepted |>
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
    message("Generating ", dates[ii])
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

if (any(grepl("generate_puzzles\\.R$", commandArgs(FALSE)))) {
  args <- commandArgs(trailingOnly = TRUE)
  days <- if (length(args) >= 1) as.integer(args[[1]]) else 90
  start_date <- if (length(args) >= 2) args[[2]] else "2026-05-03"
  write_batch(start_date = start_date, days = days)
}
