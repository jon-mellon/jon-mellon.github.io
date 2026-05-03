
findMinLength <- function(x) {
  
  couldSpaceSplit <- function(x, space) {
    second.word <- length(x) - space
    first.word <- (space-1)
    if(second.word>=3 & first.word>=3) {
      return(TRUE)
    } else{
      return(FALSE)
    }
  }  
  if(length(x) %in% 3:8) {
    spaces <- which(x=="")
    split.possible <- sapply(spaces, couldSpaceSplit, x = x)
    
    if(all(!split.possible)) {
      x[x==""] <- " "
      x <- gsub("^ +| +$", "", paste(x, collapse = ""))
      
      return(min(c(nchar(x), 6)))
    } else {
      spaces <- spaces[split.possible]  
    }
    answer <- 3
    minWordSizeForSplit <- function(x, space) {
      rightword <- x[(space+1):length(x)]
      leftword <- x[1:(space-1)]
      rightword[rightword==""] <- " "
      leftword[leftword==""] <- " "
      
      leftword <- gsub("^ +| +$", "", paste(leftword, collapse = ""))
      rightword <- gsub("^ +| +$", "", paste(rightword, collapse = ""))
      
      return(max(c(nchar(rightword), nchar(leftword))))
    }
    min(sapply(spaces, minWordSizeForSplit, x = x))
    
    return(answer)
    
  } else {
    
    return(min(c(length(x), 6)))
  }
}



makeOneGameBoard <- function(boardtemp, chosen.words) {
  boardorig <- boardtemp
  boardprev <- boardtemp
  boardprev[] <- NA
  ii <- 1
  while(!identical(boardprev,boardtemp)) {
    print(ii)
    boardprev <- boardtemp
    
    boardtemp <- deleteOneStep(boardtemp, chosen.words = chosen.words, 
                               boardsolution = boardorig) 
    if(identical(boardprev,boardtemp)) {
      boardtemp <- deleteOneStep(boardtemp, chosen.words = chosen.words, 
                                 boardsolution = boardorig) 
    }
    ii <- ii + 1
  }
  return(boardtemp)
}


deleteOneStep <- function(boardtemp, chosen.words, boardsolution) {
  possibledeletes <- which(boardtemp!="")
  possibledeletes <- c(paste0("C", 1:8), paste0("R", 1:8), possibledeletes)
  
  deleted.boards <- lapply(possibledeletes, 
                           deleteBoardSquare,
                           boarddelete = boardtemp)
  solved.boards <- list()
  for(pp in 1:length(deleted.boards)) {
    solved.boards[[pp]]<- boardSolver(partialboard = deleted.boards[[pp]], 
                                      chosen.words= chosen.words)
  }
  # deleted.boards[[3]]
  # solved.boards[[3]]
  
  solved.boards.check <- sapply(solved.boards, 
                                isBoardSolved, solution = boardsolution)
  possibledeletes <- possibledeletes[solved.boards.check]
  if(length(possibledeletes)!=0) {
    deletion.choice <- sample(rep(possibledeletes,2 ), 1)
    
    boardtemp <- deleteBoardSquare(boarddelete = boardtemp, delete = deletion.choice)  
    possibledeletes <- possibledeletes[possibledeletes!=deletion.choice]
  } else {
    warning("No possible deletes that solve the puzzle")
  }
  return(boardtemp)
}
getWordPieces <- function(pos) {
  boardlogical <- matrix(FALSE, nrow = 8, ncol = 8)
  
  if(pos["dim"]==1) {
    boardlogical[pos["row"], pos["col"]:(pos["col"] + (pos["length"]-1))] <- TRUE
    
  }
  if(pos["dim"]==2) {
    boardlogical[pos["row"]:(pos["row"] + (pos["length"]-1)), pos["col"]] <- TRUE
  }
  pieces <- which(boardlogical)
  return(pieces)
}
eliminateSpaces <- function(boardtest, all.words.pos) {
  unique.pieces <- unique(unlist(lapply(all.words.pos, getWordPieces)))  
  never.in.words <- (1:64)[!(1:64) %in% unique.pieces]
  boardtest[never.in.words] <- NA
  return(boardtest)
}

solveOneOut <- function(x) {
  if(sum(x=="")==1 && (x[1]==""|x[length(x)]=="")) {
    possible.solution <- x[x!=""]
    if(any(paste(possible.solution, collapse="")==words$word) & 
       length(possible.solution>=3)){
      candidates <- words[words$word_length==length(x), ]
      candidates <- do.call(rbind, strsplit(candidates$word, ""))
      match.count <- rowSums(t(t(candidates[, -which(x=="")])==possible.solution))
      candidates <- candidates[match.count==length(possible.solution), , drop = F]
      
      if(nrow(candidates)==0) {
        x <- x[x!=""]
      }
    }
  }
  return(x)
}
trimVector <- function(x) {
  x[x==""] <- " "
  x <- paste(x, collapse = "")
  x <- gsub("^ +| +$", "", x)
  x <- strsplit(x, "")[[1]]
  x[x==" "] <- ""
  return(x)
}
boardSolver <- function(partialboard, chosen.words) {
  prev.board <- partialboard
  prev.board[] <-NA
  while(!identical(prev.board, partialboard)) {
    prev.board <- partialboard
    partialboard <- boardSolverStep(boardtest = partialboard, chosen.words)  
    rownames(partialboard) <- as.vector(rownames(partialboard))
    colnames(partialboard) <- as.vector(colnames(partialboard))
    # partialboard[is.na(partialboard)] <- ""
  }
  return(partialboard)
}
boardSolverStep <- function(boardtest, chosen.words) {
  boardtest <- establishBlanksOnBoard(boardtest)
  boardtest <- guessConstraints(boardtest)
  board.target <- sum(sapply(chosen.words, nchar))
  target.lengths <- sapply(chosen.words, nchar)
  board.answers <- sum(boardtest[!is.na(boardtest)]!="")
  board.missing <- board.target - board.answers
  
  boardtest <- fillColRowConstraint(boardtest, 
                                    rowknown = rownames(boardtest), 
                                    colknown = colnames(boardtest))
  boardtest <- establishBlanksOnBoard(boardtest)
  boardtest <- establishBlanksOnBoard(boardtest)
  
  row.words <- extractWords(boardtest, dim = "row")
  col.words <- extractWords(t(boardtest), dim = "col")
  all.words <- c(row.words$cands, col.words$cands)
  all.words.pos <- c(row.words$pos, col.words$pos)
  boardtest <- eliminateSpaces(boardtest = boardtest, all.words.pos = all.words.pos)
  
  row.words <- extractWords(boardtest, dim = "row")
  col.words <- extractWords(t(boardtest), dim = "col")
  all.words <- c(row.words$cands, col.words$cands)
  all.words.pos <- c(row.words$pos, col.words$pos)
  
  irrelevant.blanks <- !sapply(all.words, function(x) sum(x!=""))>(3-board.missing)
  all.words <- all.words[!irrelevant.blanks]
  all.words.pos <- all.words.pos[!irrelevant.blanks]
  # boardtest <- eliminateSpaces(boardtest = boardtest, all.words.pos = all.words.pos)
  
  # row.words <- extractWords(boardtest, dim = "row")
  # col.words <- extractWords(t(boardtest), dim = "col")
  # all.words <- c(row.words$cands, col.words$cands)
  # all.words.pos <- c(row.words$pos, col.words$pos)
  # 
  all.words <- lapply(all.words, solveOneOut)
  
  target.lengths.remain <- target.lengths
  
  definite <- sapply(all.words, function(x) all(x!=""))
  decided.words <- all.words[definite]
  decided.words.pos <- all.words.pos[definite]
  
  decided.lengths <- sapply(decided.words, length)
  for(kk in decided.lengths) {
    target.lengths.remain <- target.lengths.remain[-which(target.lengths.remain==kk)[1]]
  }
  
  all.words <- all.words[!definite]
  all.words.pos <- all.words.pos[!definite]
  
  valid.three <- sapply(all.words, function(x)  
    (length(x)==3) && !all(x==c("","", "")) && ((sum(x==c("", "*", "*"))==1 | sum(x==c("*", "*", ""))==1)))
  
  if(length(valid.three)>0) {
    partial.words <- all.words[valid.three]
    partial.words.pos <- all.words.pos[valid.three]
    
    all.words <- all.words[!valid.three]
    all.words.pos <- all.words.pos[!valid.three]
    
    decided.lengths <- rep(3, sum(valid.three))
    for(kk in decided.lengths) {
      target.lengths.remain <- target.lengths.remain[-which(target.lengths.remain==kk)[1]]
    }
  }
  
  
  target.lengths.remain <- sort(target.lengths.remain)
  
  # x <- all.words[[1]]
  
  for(clen in target.lengths.remain) {
    min.lengths <- sapply(all.words, findMinLength)
    if(sum(min.lengths<=clen)==1) {
      word.index <- which(min.lengths<=clen)
      word.partial <- all.words[word.index]
      word.partial.pos <- all.words.pos[word.index]
      if(clen==min.lengths[word.index]) {
        word.partial[[1]] <- word.partial[[1]][word.partial[[1]]!=""]
        decided.words <- c(decided.words, word.partial)
        decided.words.pos <- c(decided.words.pos, word.partial.pos)
        all.words <- all.words[-word.index]
        all.words.pos <- all.words.pos[-word.index]
        
        target.lengths.remain <- target.lengths.remain[-which(target.lengths.remain==clen)[1]]
      } else {
        word.partial[[1]] <- word.partial[[1]][word.partial[[1]]!=""]
        partial.words <- c(partial.words, word.partial)
        partial.words.pos <- c(partial.words.pos, word.partial.pos)
        all.words <- all.words[-word.index]
        all.words.pos <- all.words.pos[-word.index]
        target.lengths.remain <- target.lengths.remain[-which(target.lengths.remain==clen)[1]]
      }
    }
  }
  
  target.lengths.remain <- sort(target.lengths.remain, decreasing = TRUE)
  
  for(clen in target.lengths.remain) {
    min.lengths <- sapply(all.words, findMinLength)
    
    if(all(clen>=target.lengths.remain)) {
      max.word.pos <- (clen==min.lengths)
      if(any(max.word.pos)) {
        
        max.word <- lapply(all.words[max.word.pos], trimVector)
        candidates <- words[words$word_length==clen, "word"]
        
        candidates <- do.call(rbind, strsplit(candidates, ""))
        blank.pos <- which(max.word[[1]]=="")
        nonblank.count <- sum(max.word[[1]]!="")
        match.count.cand <- rowSums(t(t(candidates[, -blank.pos])==max.word[[1]][-blank.pos]))
        
        candidates <- candidates[match.count.cand==nonblank.count, , drop = F]
        
        if(nrow(candidates)==1) {
          max.word[[1]] <- candidates
          decided.words <- c(decided.words, max.word)
          decided.words.pos <- c(decided.words.pos, all.words.pos[max.word.pos])
          all.words <- all.words[-which(max.word.pos)]
          all.words.pos <- all.words.pos[-which(max.word.pos)]
          target.lengths.remain <- target.lengths.remain[
            -which(target.lengths.remain==clen)[1]]
        }
      }
      
    }
  }
  
  
  # partial.options <- lapply(partial.words, enumerateRemaining)
  # partial.options <- partial.options[sapply(partial.options, nrow)==1]
  if(length(decided.words)>0) {
    boardtest <- putWordsOnBoard(boardtest = boardtest, 
                                 decided.words, decided.words.pos)    
  }
  
  boardtest <- fillColRowConstraint(boardtest, 
                                    rowknown = rownames(boardtest), 
                                    colknown = colnames(boardtest))
  boardtest <- establishBlanksOnBoard(boardtest)
  boardtest <- establishBlanksOnBoard(boardtest)
  boardtest <- guessConstraints(boardtest)
  return(boardtest)
}

putWordOnBoard<- function(boardtest, word, word.pos) {
  if(word.pos["dim"]==1) {
    min.dim <- "col"
    dim <- "row"
  }
  if(word.pos["dim"]==2) {
    min.dim <- "row"
    dim <- "col"
  }
  min.pos <- word.pos[min.dim]:(word.pos[min.dim]+ (word.pos["length"]-1))
  maj.pos <- word.pos[dim]
  pos.length <- length(boardtest[maj.pos, min.pos])
  
  word.length <- length(word)
  start.opts <- unique(1:(1+(pos.length-word.length)))
  
  matchForStart <- function(pool, word.test, start) {
    sum(pool[start:(start+length(word.test)-1)]==word.test, na.rm = T)
  }
  if(dim=="row") {
    row.pos <- maj.pos
    col.pos <- min.pos
  } else {
    row.pos <- min.pos
    col.pos <- maj.pos
  }
  match.rate <- sapply(start.opts, word.test = word,
                       pool = boardtest[row.pos, col.pos],
                       matchForStart)
  start.chosen <- start.opts[which.max(match.rate)]
  min.pos <- min.pos[start.chosen:(start.chosen+word.length-1)]
  if(dim=="row") {
    row.pos <- maj.pos
    col.pos <- min.pos
  } else {
    row.pos <- min.pos
    col.pos <- maj.pos
  }
  boardtest[row.pos, col.pos] <- word
  if(dim=="row") {
    if(min(col.pos)>1) {
      boardtest[row.pos, min(col.pos)-1] <- NA
    }
    if(max(col.pos)<8) {
      boardtest[row.pos, max(col.pos)+1] <- NA
    }  
  } else {
    if(min(row.pos)>1) {
      boardtest[min(row.pos)-1, col.pos] <- NA
    }
    if(max(row.pos)<8) {
      boardtest[max(row.pos)+1, col.pos] <- NA
    } 
  }
  return(boardtest)
}


isBoardSolved <- function(testboard, solution) {
  testboard[is.na(testboard)] <- ""
  solution[is.na(solution)] <- ""
  rownames(solution) <- as.vector(rownames(solution))
  colnames(solution) <- as.vector(colnames(solution))
  identical(testboard, solution)
}

guessConstraints <- function(boardtest) {
  candidates <- words[words$word_length==8, "word"]
  candidates <- do.call(rbind, strsplit(candidates, ""))
  
  if(any(colnames(boardtest)=="")) {
    col.solved <- colSums(is.na(boardtest))==7
    
    if(length(col.solved)>0) {
      col.letter.solutions <- apply(boardtest[, col.solved, drop = F], na.omit, MARGIN = 2)
      colnames(boardtest)[col.solved] <-  col.letter.solutions  
    }
    if(any(colnames(boardtest)=="")) {
      col.miss.pos <- which(colnames(boardtest)=="")
      target.length <- ncol(boardtest)-length(col.miss.pos)
      
      cand.out <- candidates[rowSums(t(colnames(boardtest)[-col.miss.pos]==t(candidates[, -col.miss.pos, drop = F])))==target.length, ,drop = F]
      if(nrow(cand.out)==1) {
        colnames(boardtest) <- cand.out
      }
    }
  }
  if(any(rownames(boardtest)=="")) {
    row.solved <- rowSums(is.na(boardtest))==7
    
    if(length(row.solved)>0) {
      row.letter.solutions <- apply(boardtest[row.solved, , drop = F], na.omit, MARGIN = 1)
      rownames(boardtest)[row.solved] <-  row.letter.solutions  
    }
    if(any(rownames(boardtest)=="")) {
      row.miss.pos <- which(rownames(boardtest)=="")
      target.length <- ncol(boardtest)-length(row.miss.pos)
      cand.out <- candidates[rowSums(t(rownames(boardtest)[-row.miss.pos]==t(candidates[, -row.miss.pos, drop = F])))==target.length, ,drop = F]
      if(nrow(cand.out)==1) {
        rownames(boardtest) <- cand.out
      }
    }
  }
  return(boardtest)
}



deleteBoardSquare <- function(boarddelete, delete) {
  if(grepl("R", delete)) {
    rownames(boarddelete)[as.numeric(gsub("R", "", delete))] <- ""
    return(boarddelete)
  }
  if(grepl("C", delete)) {
    colnames(boarddelete)[as.numeric(gsub("C", "", delete))] <- ""
    return(boarddelete)
  }
  delete <- as.numeric(delete)
  boarddelete[delete] <- ""
  return(boarddelete)
}

naormissstr <- function(x) {
  y <- is.na(x)
  y[which(x=="")] <- TRUE
  return(y)
}
establishBlanksOnBoard <- function(boardtest) {
  
  for(rowtemp in 1:8) {
    if(all(!naormissstr(boardtest[rowtemp, 3:8]))) {
      boardtest[rowtemp, 2] <- NA
    }
    if(all(!naormissstr(boardtest[rowtemp, 2:7]))) {
      boardtest[rowtemp, 1] <- NA
      boardtest[rowtemp, 8] <- NA
    }
    if(all(!naormissstr(boardtest[rowtemp, 1:6]))) {
      boardtest[rowtemp, 7] <- NA
    }
    
    if(all(!naormissstr(boardtest[3:8, rowtemp]))) {
      boardtest[2, rowtemp] <- NA
    }
    if(all(!naormissstr(boardtest[2:7, rowtemp]))) {
      boardtest[1, rowtemp] <- NA
      boardtest[8, rowtemp] <- NA
    }
    if(all(!naormissstr(boardtest[1:6, rowtemp]))) {
      boardtest[7, rowtemp] <- NA
    }    
    
    
    for(coltemp in 1:8) {
      
      
      
      currentcell <- !is.na(boardtest[rowtemp, coltemp]) && boardtest[rowtemp, coltemp]!=""
      if(currentcell) {
        nextcellinrow <- coltemp<8 && (!is.na(boardtest[rowtemp, coltemp+1]) && boardtest[rowtemp, coltemp+1]!="")
        prevcellinrow <- coltemp>1 && (!is.na(boardtest[rowtemp, coltemp-1]) && boardtest[rowtemp, coltemp-1]!="")
        nextcellincol <- rowtemp<8 && (!is.na(boardtest[rowtemp+1, coltemp]) && boardtest[rowtemp+1, coltemp]!="")
        prevcellincol <- rowtemp>8 && (!is.na(boardtest[rowtemp-1, coltemp]) && boardtest[rowtemp-1, coltemp]!="")
        
        if(nextcellinrow) {
          if(rowtemp<8) {
            boardtest[rowtemp+1, coltemp] <- NA
            boardtest[rowtemp+1, coltemp+1] <- NA
          }
          if(rowtemp>1) {
            boardtest[rowtemp-1, coltemp] <- NA  
            boardtest[rowtemp-1, coltemp+1] <- NA  
          }
          
        }
        if(prevcellinrow) {
          if(rowtemp<8) {
            boardtest[rowtemp+1, coltemp] <- NA
            boardtest[rowtemp+1, coltemp-1] <- NA
          }
          if(rowtemp>1) {
            boardtest[rowtemp-1, coltemp] <- NA  
            boardtest[rowtemp-1, coltemp-1] <- NA  
          }
        }
        if(nextcellincol){
          if(coltemp<8) {
            boardtest[rowtemp, coltemp+1] <- NA
            boardtest[rowtemp+1, coltemp+1] <- NA
          }
          if(coltemp>1) {
            boardtest[rowtemp, coltemp-1] <- NA  
            boardtest[rowtemp+1, coltemp-1] <- NA  
          }
        }
        if(prevcellincol) {
          if(coltemp<8) {
            boardtest[rowtemp, coltemp+1] <- NA
            boardtest[rowtemp-1, coltemp+1] <- NA
          }
          if(coltemp>1) {
            boardtest[rowtemp, coltemp-1] <- NA  
            boardtest[rowtemp-1, coltemp-1] <- NA  
          }
        }
      }
      if((coltemp==8 || is.na(boardtest[rowtemp, coltemp+1])) && 
         (coltemp==1 || is.na(boardtest[rowtemp, coltemp-1])) && 
         (rowtemp==8 || is.na(boardtest[rowtemp+1, coltemp])) && 
         (rowtemp==1 || is.na(boardtest[rowtemp-1, coltemp]))) {
        boardtest[rowtemp, coltemp] <- NA
      }
      if(coltemp>1 & rowtemp<8) {
        testcondition <- !is.na(boardtest[rowtemp, coltemp]) && 
          boardtest[rowtemp, coltemp]=="" && # current square is blank
          !is.na(boardtest[rowtemp+1, coltemp]) && 
          boardtest[rowtemp+1, coltemp]=="" && # square below is blank
          (rowtemp==1 || is.na(boardtest[rowtemp-1, coltemp])) && # square above is NA
          (coltemp==8 || is.na(boardtest[rowtemp, coltemp+1])) && # square to right is NA
          !is.na(boardtest[rowtemp+1, coltemp-1]) && # square below and left is not NA 
          boardtest[rowtemp+1, coltemp-1]!=""  # square below and left is not blank
        if(testcondition) {
          boardtest[rowtemp, coltemp] <- NA
        }
      }     
      if(coltemp<8 & rowtemp<8) {
        testcondition <- !is.na(boardtest[rowtemp, coltemp]) && 
          boardtest[rowtemp, coltemp]=="" && # current square is blank
          !is.na(boardtest[rowtemp+1, coltemp]) && 
          boardtest[rowtemp+1, coltemp]=="" && # square below is blank
          (rowtemp==1 || is.na(boardtest[rowtemp-1, coltemp])) && # square above is NA
          (coltemp==1 || is.na(boardtest[rowtemp, coltemp-1])) && # square to left is NA
          !is.na(boardtest[rowtemp+1, coltemp+1]) && # square below and right is not NA 
          boardtest[rowtemp+1, coltemp+1]!=""  # square below and right is not blank
        if(testcondition) {
          boardtest[rowtemp, coltemp] <- NA
        }
        
        # boardtest[rowtemp, coltemp]
        testcondition <- coltemp<7 && 
          !is.na(boardtest[rowtemp, coltemp+1]) && # cell to right not blank
          boardtest[rowtemp, coltemp+1]!="" &&
          !is.na(boardtest[rowtemp, coltemp+2]) && # cell two to right not blank
          boardtest[rowtemp, coltemp+2]!="" && 
          (coltemp==6 || is.na(boardtest[rowtemp, coltemp+3])) # cell three to right NA
        if(testcondition) {
          if(rowtemp>1) {
            boardtest[rowtemp-1, coltemp] <- NA  
          }
          if(rowtemp<8) {
            boardtest[rowtemp+1, coltemp] <- NA  
          }
        }
        
        testcondition <- rowtemp>2 && 
          !is.na(boardtest[rowtemp - 1, coltemp]) &&
          boardtest[rowtemp - 1, coltemp]!="" &&
          !is.na(boardtest[rowtemp - 2, coltemp]) && 
          boardtest[rowtemp - 2, coltemp]!="" &&
          (rowtemp==3 || is.na(boardtest[rowtemp - 3, coltemp]))
          
        if(testcondition) {
          if(coltemp<8) {
            boardtest[rowtemp, coltemp+1] <- NA    
          }
          if(coltemp>1) {
            boardtest[rowtemp, coltemp-1] <- NA    
          }
          
          
        }
        
      }
      
      # !is.na(boardtest[rowtemp, coltemp]) && 
      #   boardtest[rowtemp, coltemp]=="" &&
      #   is.na(boardtest[rowtemp-1, coltemp])
      
    }
  }
  return(boardtest)
}


fillColRowConstraint <- function(boardtest, colknown, rowknown) {
  for(rowtemp in 1:8) {
    # col
    if(!any(colknown[rowtemp]==boardtest[, rowtemp], na.rm = T)) {
      if(sum(boardtest[, rowtemp]=="", na.rm = T)==1) {
        boardtest[which(boardtest[, rowtemp]==""), rowtemp] <- colknown[rowtemp]
      }
    }
    #row
    if(!any(rowknown[rowtemp]==boardtest[rowtemp, ], na.rm = T)) {
      if(sum(boardtest[rowtemp, ]=="", na.rm = T)==1) {
        boardtest[rowtemp, which(boardtest[rowtemp, ]=="")] <- rowknown[rowtemp]
      }
    }
  }
  return(boardtest)
}



extractWords <- function(boardtest, dim) {
  word.cands <- list()
  word.pos <- list()
  for(rowtemp in 1:8) {
    wordstarts <- which(is.na(boardtest[rowtemp, ]))+1
    wordends <- which(is.na(boardtest[rowtemp, ]))-1
    
    wordpos <- data.frame(start=c(1,wordstarts), end = c(wordends,8))
    wordpos <- wordpos[wordpos$start<8, ]
    wordpos$length <- wordpos$end -  wordpos$start + 1
    wordpos <- wordpos[wordpos$length>2, , drop = F]
    if(nrow(wordpos)!=0) {
      for(kk in 1:nrow(wordpos)) {
        word.cands[[length(word.cands)+1]] <- boardtest[rowtemp, wordpos$start[kk]:wordpos$end[kk]]  
        if(dim=="row") {
          word.pos[[length(word.pos)+1]] <- c(row = rowtemp, 
                                              col = wordpos$start[kk], 
                                              length = wordpos$end[kk] - wordpos$start[kk] + 1,
                                              dim = 1)  
        }
        if(dim=="col") {
          word.pos[[length(word.pos)+1]] <- c(row = wordpos$start[kk], 
                                              col = rowtemp, 
                                              length = wordpos$end[kk] - wordpos$start[kk] + 1,
                                              dim = 2)  
        }
      }  
    }
    
  }
  out <- list(cands  = word.cands, pos = word.pos)
  return(out)
}


enumerateRemaining <- function(x) {
  options <- words$word[words$word_length==length(x)]
  options <- strsplit(options, "")
  options <- do.call(rbind,options)
  known <- x[x!=""]
  options.known <- options[, x!=""]
  possible.remaining <- options[ rowSums(t(t(options.known)==known))==length(known), ]
  return(possible.remaining)
}




putWordsOnBoard <- function(boardtest, decided.words, decided.words.pos) {
  for(kk in 1:length(decided.words)) {
    boardtest <- putWordOnBoard(boardtest, 
                                word = decided.words[[kk]], 
                                word.pos = decided.words.pos[[kk]])
  }
  return(boardtest)
}

