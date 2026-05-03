test <- boardSolver(partialboard = deleted.boards[[pp]], 
                    chosen.words= chosen.words)
test[is.na(test)] <- ""
rownames(test)
colnames(test)
test==board

isBoardSolved(test, solution = board)
rownames(board)


boardtemp2 <- boardtemp
colnames(boardtemp2)[5] <- ""
boardSolver(partialboard = boardtemp2, chosen.words) 
boardSolver(boardtemp, chosen.words) 


# 3:
findMinLength(x = c("", "", "", "", "", "", "", "D"))
# 3:
findMinLength(x = c("", "", "", "", "C", "", "E", "D"))
# 4:
findMinLength(x = c("", "C", "", "E", "D"))
# 4:
findMinLength(x = c("C", "", "E", "D"))
# 5:
findMinLength(x = c("A", "C", "", "E", "D"))
# 6:
findMinLength(x = c("B", "A", "C", "", "E", "D"))

# 3
findMinLength(x = c("B", "A", "C", "", "E", "D", "M"))