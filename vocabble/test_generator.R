#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(jsonlite)
  library(testthat)
})

`%||%` <- function(x, y) if (is.null(x)) y else x
repo_root <- normalizePath(getwd(), mustWork = TRUE)
source(file.path(repo_root, "vocabble", "generate_puzzles.R"))
dictionary <- read_dictionary()

puzzle_dir <- file.path(repo_root, "static", "vocabble", "puzzles")
manifest_path <- file.path(puzzle_dir, "manifest.json")

test_that("puzzle manifest exists", {
  expect_true(file.exists(manifest_path))
})

manifest <- read_json(manifest_path, simplifyVector = TRUE)
puzzle_files <- file.path(puzzle_dir, manifest$puzzles$file)

test_that("all manifest puzzles exist", {
  expect_true(all(file.exists(puzzle_files)))
})

for (path in puzzle_files) {
  puzzle <- read_json(path, simplifyVector = TRUE)
  board <- as.matrix(puzzle$solution)
  givens <- as.matrix(puzzle$puzzle)
  top <- strsplit(puzzle$topWord, "", fixed = TRUE)[[1]]
  side <- strsplit(puzzle$sideWord, "", fixed = TRUE)[[1]]
  ship_lengths <- if (is.data.frame(puzzle$ships)) puzzle$ships$length else vapply(puzzle$ships, `[[`, numeric(1), "length")
  linear_cells <- function(row, col, direction, length) {
    if (direction == "H") {
      rows <- rep(row, length)
      cols <- col:(col + length - 1)
    } else {
      rows <- row:(row + length - 1)
      cols <- rep(col, length)
    }
    (cols - 1) * 8 + rows
  }
  ship_cells <- lapply(seq_len(nrow(puzzle$ships)), function(ii) {
    linear_cells(puzzle$ships$row[[ii]], puzzle$ships$col[[ii]], puzzle$ships$direction[[ii]], puzzle$ships$length[[ii]])
  })
  orthogonal_neighbors <- function(cell) {
    row <- ((cell - 1) %% 8) + 1
    col <- ((cell - 1) %/% 8) + 1
    candidates <- rbind(c(row - 1, col), c(row + 1, col), c(row, col - 1), c(row, col + 1))
    candidates <- candidates[candidates[, 1] >= 1 & candidates[, 1] <= 8 & candidates[, 2] >= 1 & candidates[, 2] <= 8, , drop = FALSE]
    (candidates[, 2] - 1) * 8 + candidates[, 1]
  }
  no_touch <- function() {
    all_cells <- unlist(ship_cells)
    if (anyDuplicated(all_cells)) return(FALSE)
    for (ii in seq_along(ship_cells)) {
      own <- ship_cells[[ii]]
      other <- setdiff(all_cells, own)
      neighbors <- unique(unlist(lapply(own, orthogonal_neighbors)))
      if (length(intersect(neighbors, other))) return(FALSE)
    }
    TRUE
  }

  test_that(paste("valid puzzle", puzzle$date), {
    expect_equal(dim(board), c(8L, 8L))
    expect_equal(dim(givens), c(8L, 8L))
    expect_equal(nchar(puzzle$topWord), 8L)
    expect_equal(nchar(puzzle$sideWord), 8L)
    expect_equal(sort(ship_lengths), c(3, 3, 4, 4, 5, 6))
    expect_equal(sum(board != ""), sum(c(6, 5, 4, 4, 3, 3)))
    expect_true(all(vapply(seq_len(8), function(ii) side[ii] %in% board[ii, board[ii, ] != ""], logical(1))))
    expect_true(all(vapply(seq_len(8), function(ii) top[ii] %in% board[board[, ii] != "", ii], logical(1))))
    expect_true(all(givens[givens != ""] == board[givens != ""]))
    expect_true(no_touch())
    expect_true(isTRUE(puzzle$uniqueness$unique))
    expect_equal(puzzle$uniqueness$method, "word-removal backtracking")
    puzzle_list <- read_json(path, simplifyVector = FALSE)
    disambiguated <- disambiguate_same_slot_words(puzzle_list, dictionary)
    expect_equal(disambiguated$difficulty$givenLetters, puzzle_list$difficulty$givenLetters)
    expect_false(has_fully_clued_ship(puzzle_list))
    expect_equal(puzzle$difficulty$label, "medium-hard")
  })
}
