#!/usr/bin/env Rscript

suppressPackageStartupMessages({
  library(jsonlite)
  library(testthat)
})

`%||%` <- function(x, y) if (is.null(x)) y else x
repo_root <- normalizePath(getwd(), mustWork = TRUE)

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
    expect_equal(puzzle$difficulty$label, "medium-hard")
  })
}
