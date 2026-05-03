# Vocableships
rm(list = ls())
source("solver_functions.R")
source("solution_functions.R")
library(PubMedScrapeR)
library(matrixStats)
library(RJSONIO)
library(words)

swear <- readLines("https://www.cs.cmu.edu/~biglou/resources/bad-words.txt")
swear <- toupper(swear)
# data(dictionary)
exclusions <- c("lewis")
words <- as.character(dictionary$V1)
words <- data.frame(word = words, word_length = nchar(words), 
                    stringsAsFactors = F)
words <- words[words$word %in% words::words$word, ]
words <- words[!words$word %in% c(swear, exclusions), ]


words$word <- toupper(words$word)

length.set <- c(6,5,4,4,3,3)

board.stuff <- createBoardSolution(length.set = length.set,
                                   words = words)
board <- board.stuff$board
chosen.words <- board.stuff$chosen.words

challenge1 <- makeOneGameBoard(boardtemp = board, chosen.words)



clue.num <- sum(challenge1!="") + sum(colnames(challenge1)!="") + sum(rownames(challenge1)!="")
(sum(nchar(chosen.words)) + 16) - clue.num

challengen <- challenge1
challengen[3, 4] <- ""

board2 <- boardSolver(partialboard = challengen, chosen.words = chosen.words)
boardSolver(partialboard = board2, chosen.words = chosen.words)
d <- deleteOneStep(boardtemp = challenge1, 
              boardsolution = board, 
              chosen.words = chosen.words)

d <- deleteOneStep(boardtemp = d, 
                   boardsolution = board, 
                   chosen.words = chosen.words)

challenge3 <- makeOneGameBoard(boardtemp = board, chosen.words)

challengen <- challenge2
rownames(challengen)[8] <- ""
# challengen[8, 6] <- ""
challengen <- boardSolver(partialboard = challengen, chosen.words)
isBoardSolved(board = challengen, solution = board)

challengen[is.na(challengen)] <- ""
colnames(challengen) <- as.vector(colnames(challengen))
identical(challengen, board)
all(challengen==board)

deleteOneStep(challengen)



board2 <- board
colnames(board2) <- NULL
rownames(board2) <- NULL
challengeout <- challenge1 
rowstart <- rownames(challengeout)
colstart <- colnames(challengeout)
colnames(challengeout) <- NULL
rownames(challengeout) <- NULL


toJSON(list(solution = t(board2), 
     puzzle = t(challengeout), 
     rowside = rownames(board),
     coltop = colnames(board), 
     colinit = colnames(board)==colstart,
     rowinit = rownames(board)==rowstart))


# make this object contain everything needed to drop into the javascript
game.settings

