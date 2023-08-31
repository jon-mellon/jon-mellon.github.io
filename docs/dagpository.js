foldTopLevels = function() {
  var toplevids = [];
  for (var i = 0; i < nestedvars.children.length; i++) {
    toplevids.push(nestedvars.children[i].id);
  }
  var toggler = document.getElementsByClassName("caret");
  for (var i = 0; i < toggler.length; i++) {
    if(toplevids.includes(toggler[i].id) ) {
      toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
       toggler[i].classList.toggle("caret-down");
    }
}
}



DOIChecker = function(doi) {
  for (var i = 0; i < currentitems.length; i++) {
    if(currentitems[i].DOI!=null) {
      if(currentitems[i].DOI.toLowerCase()==doi.toLowerCase()) {
        return true;
      }
    }
  } 
  return false;
}

setSize = function(x) {
  var sizerunning=true;
  var size = 0;
  while(sizerunning) {
    
    if(x[size]==null) {
      sizerunning= false;
    } 
    size = size+1
    }
    return(size);
}

unclusterAllNodes = function() {
  let allclusters = getAllClusters();

  for (var i = 0; i < allclusters.length; i++) {
    try{
      console.log("Unclustering:" + allclusters[i]);
      network.openCluster(allclusters[i]);
    } catch(e) {
      
    }
    
  }
}


hideChildren = function(nodeid) {
   
    var parentlabel;
    let hidethese = reachableNodesGeneral(nodeid, edgesh);
    if (hidethese.length > 0) {
        
    }
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].id == nodeid) {
            nodesh[i].color = "#09e472";
            parentlabel = nodesh[i].label
        }
     
        }
    hidethese.push(nodeid);
    clusterNodes(nodeidstocluster = hidethese, 
      label = parentlabel, origid = nodeid);
    updateAllClusterEdges();
}

hideChildren2 = function(nodeid) {
    var parentlabel;
    let hidethese = reachableNodesGeneral(nodeid, edgesh);
    
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].id == nodeid) {
            nodesh[i].color = "#09e472";
            parentlabel = nodesh[i].label
        }
      
    }
    hidethese.push(nodeid);
    clusterNodes2(nodeidstocluster = hidethese, 
      label = parentlabel, origid = nodeid);
}

clusterNodes = function(nodeidstocluster, label, origid) {
      let clusterid = "cluster"+(clusterednodes.length+1); 
      network.cluster({
      joinCondition(nodeOptions) {
        if(nodeidstocluster.includes(nodeOptions.id)) {
          return true;
        } else {
          return false;
        }
      },
      clusterNodeProperties: {
        id: clusterid,
        borderWidth: 3,
        color: "#09e472",
        label: label,
        allowSingleNodeCluster: true,
      }});
      
      clusterednodes.push({id: clusterid,
        origid: origid,
        label: label});
      nodesView.refresh();
}

clusterNodes2 = function(nodeidstocluster, label, origid) {
      let clusterid = "cluster"+(clusterednodes.length+1); 
      network.cluster({
      joinCondition(nodeOptions) {
        if(nodeidstocluster.includes(nodeOptions.id)) {
          return true;
        } else {
          return false;
        }
      },
      clusterNodeProperties: {
        id: clusterid,
        borderWidth: 3,
        color: "#09e472",
        label: label,
        allowSingleNodeCluster: true,
      }});
      
      clusterednodes.push({id: clusterid,
        origid: origid,
        label: label});
}


clusterFoldedNodes = function() {
  // this function clusters everything in the foldednodes array
  for (var i = 0; i < foldednodes.length; i++) {
    hideChildren2(foldednodes[i]);
  }
}

currentNetworkEdgeSet = function() {
  // create currentedgeset from the visible network
  currentedgeset = [];
  for (var i = 0; i < network.body.edgeIndices.length; i++) {
    currentedgeset[i] = {from: network.body.edges[network.body.edgeIndices[i]].fromId,
    to: network.body.edges[network.body.edgeIndices[i]].toId};
  }
  currentids = network.body.nodeIndices;
  currentvars = [];
  for (var i = 0; i < currentids.length; i++) {
    currentvars[i] = network.body.nodes[currentids[i]].options.label;
  }
  
  let origids = nodesView.getIds();
    
  let origvars = [];
  for (var i = 0; i < origids.length; i++) {
    origvars[i] = allvars[origids[i]];
  }
  combids = currentids;
  combvars = currentvars;
  for (var i = 0; i < origids.length; i++) {
    if(!currentids.includes(origids[i])) {
      combids.push(origids[i]);
      combvars.push(origvars[i]);
    }
  }
}

showCurrentNetworkState = function() {
  // show all nodes
  blankNodeStatus();
  nodesView.refresh();

  // uncluster all nodes
  unclusterAllNodes();
  nodesView.refresh();

  // read variable clustering from list
  findFoldedNodes();
   
  // foldednodes now contains the current state of the list
  
  // apply variable clustering
  clusterFoldedNodes();
  
  nodesView.refresh();

  // create currentedgeset from current network
  currentNetworkEdgeSet();
  
  // calculate reachabilities from currentedgeset
  let ivselectorindex = combids[combvars.indexOf(ivselector.value)];
  let dvselectorindex = combids[combvars.indexOf(dvselector.value)];
  
  if(dvselectorindex!=null) {
    //canreachdv = reachableByNodes(dvselectorindex, currentedgeset);
    canreachdv = reachableByNodeOrParent(dvselectorindex, currentedgeset);
    
    //dvcanreach = reachableNodesGeneral(dvselectorindex, currentedgeset);
    dvcanreach = reachableNodeOrParent(dvselectorindex, currentedgeset);
  } else {
    dvcanreach = [];
    canreachdv = [];
  }
  if(ivselectorindex!=null) {
    //canreachiv = reachableByNodes(ivselectorindex, currentedgeset);
    canreachiv = reachableByNodeOrParent(ivselectorindex, currentedgeset);
    //ivcanreach = reachableNodesGeneral(ivselectorindex, currentedgeset);  
    ivcanreach = reachableNodeOrParent(ivselectorindex, currentedgeset);  
  } else {
    canreachiv = [];
    ivcanreach = [];
  }
  
  
  updateNodeStatus();
  nodesView.refresh();

  nodeids = nodesView.getIds();
    
  for (var i = 0; i < nodeids.length; i++) {
      nodecount[i] = (network.getConnectedNodes(nodeids[i], "from").length + 
              network.getConnectedNodes(nodeids[i], "to").length);
  }
  // apply variable filtering based on reachabilities
  nodesView.refresh();
  
    nodeids = nodesView.getIds();
  
  for (var i = 0; i < nodeids.length; i++) {
      nodecount[i] = (network.getConnectedNodes(nodeids[i], "from").length + 
              network.getConnectedNodes(nodeids[i], "to").length);
  }
  // apply variable filtering based on reachabilities
  nodesView.refresh();
}

reachableNodeOrParent = function(startnode, edgesetall) {
  
  var allreachable = reachableNodesGeneral(startnode, edgesetall);
  var allclusters = getAllClusters();
  for (var i = 0; i < allclusters.length; i++) {
    if(allclusters[i].includes(startnode)) {
      for (var j = 0; j < allclusters[i].length; j++) {
        allreachable = allreachable.concat(reachableNodesGeneral(allclusters[i][j], edgesetall));
      }
    }
  }
  return(allreachable)
}

reachableByNodeOrParent = function(startnode, edgesetall) {
  
  var allreachable = reachableByNodes(startnode, edgesetall);
  var allclusters = getAllClusters();
  
  for (var i = 0; i < allclusters.length; i++) {
    
    if(network.getNodesInCluster(allclusters[i]).includes(startnode)) {
       console.log("looking in cluster: " + allclusters[i]);
      for (var j = 0; j < network.getNodesInCluster(allclusters[i]).length; j++) {
       
        allreachable = allreachable.concat(reachableByNodes(allclusters[i][j], edgesetall));
      }
    }
  }
  return(allreachable)
}

//// general network ////
reachableNodesGeneral = function(startnode, edgesetall) {
    var nodesreached = [];
    var nodestocheck = [startnode];
    var nodeschecked = [];
    var dist = 0;
    while (nodestocheck.length > 0) {
        dist = dist + 1;
        for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode = nodestocheck[i];
            if(!currentnode.search==null) {
              console.log("reachablebynodes: " + currentnode);
            }
            for (var j = 0; j < edgesetall.length; j++) {
                if (edgesetall[j].from == currentnode) {
                    if (!nodesreached.includes(edgesetall[j].to)) {
                        // adding new node to reached list
                        nodesreached.push(edgesetall[j].to);
                        if (!nodeschecked.includes(edgesetall[j].to) &
                            !nodestocheck.includes(edgesetall[j].to)) {
                            // adding new node to need to check list
                            nodestocheck.push(edgesetall[j].to);
                        }
                    }
                }
            }
            // removing currentnode from the nodestocheck list
            nodestocheck.splice(nodestocheck.indexOf(currentnode), 1);
            nodeschecked.push(currentnode);
        }
    }
    return nodesreached;
}
citationPresent = function(doi) {
  for (var i = 0; i < citations.length; i++) {
    if(citations[i].DOI==doi.toLowerCase()) {
      return true;
    } 
  }  
  return false;
}
//// reference management ////
clearStudyText = function() {
    pubtext.innerHTML = ""
}
populateCiteFromDOI = function(doi) {
    
    if(citationPresent(doi)) {
      for (var i = 0; i < citations.length; i++) {
        if(citations[i].DOI==doi.toLowerCase()) {
          pubtext.innerHTML = pubtext.innerHTML + "<br>" + formatArticle(citations[i]);
        } else {
          
        }
      }
    }
    
}

getDOIFromCrossRef = function(doi) {
   if(currentenv!="offline") {
   var doipromise = fetch("https://api.crossref.org/works/" + doi)
        .then((response) => {
            //console.log("crossref API Call");
            if (response.ok) {
                let jsonout = response.json();
                return jsonout;
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
            }
        })  
   } else {
      var doipromise = new Promise((resolve, reject) => {
         var studytemp = {
            message: {
               author: [{
                     family: "Smith",
                     given: "Bob"
                  },
                  {
                     family: "Bloggs",
                     given: "Joe"
                  },
                  {
                     family: "Jones",
                     given: "Davey"
                  },
                  {
                     family: "Doe",
                     given: "Jane"
                  }
               ],
               title: ["The Causal Effect of Lorem Ipsum on tktk"],
               "container-title": ["Journal of Placeholder Studies"],
               published: {
                  "date-parts": [
                     [2023, 7]
                  ]
               },
               URL: "www.example.com",
            }
         };
         resolve(studytemp);
      });
   }
        doipromise.then(data => {
            if(!citationPresent(doi)) {
              //data.message.DOI = data.message.DOI.toLowerCase();
              citations.push(data.message);
               // remove duplicates
               var doiall = [];
               for (var i = 0; i < citations.length; i++) {
                 doiall[i] = citations[i].DOI;
               }
               citations = citations.filter(function(item, pos) {
                return doiall.indexOf(item.DOI) == pos;
               });
            }
        })
        .catch((error) => console.error("FETCH ERROR:", error));  
}

getAllDOIS = function() {
  console.log("getAllDOIS called");
  var alldois = [];
  for (var i = 0; i < edgeset.length; i++) {
    
    if(typeof edgeset[i].dois !=="undefined") {
      let tempdois = edgeset[i].dois.split(";");
      for (var j = 0; j < tempdois.length; j++) {
       alldois.push(tempdois[j]);
      }
    }
  }
  alldois  = alldois.filter(onlyUnique);
  return(alldois)  
}

fetchAllCrossRef = function() {
  var alldois = getAllDOIS();
  for (var i = 0; i < alldois.length; i++) {
    setTimeout(getDOIFromCrossRef, 50, alldois[i])
  }
}

populateDOIList = function(dois) {
    clearStudyText();
    for (var i = 0; i < dois.length; i++) {
      populateCiteFromDOI(dois[i]);
    }
    if(pubtext.innerHTML=="") {
      pubtext.innerHTML= "No reference listed";
    }
}

cleanDOI = function(doi) {
    doi = doi.replace("https://doi.org/", "");
    doi = doi.replace("http://doi.org/", "");
    doi = doi.replace("doi.org/", "");
    doi = doi.replace("www.doi.org/", "");
    return (doi)
}
formatArticle = function(dat) {
    var authors = [];
    for (var i = 0; i < dat.author.length; i++) {
        authors[i] = dat.author[i].given + " " + dat.author[i].family;
    }
    var authorlist = authors.join(", ");
    var title = dat.title[0];
    var journal = dat["container-title"][0];
    if (journal==null) {
        journal = "";
    }
    var year = dat.published["date-parts"][0][0];
    let doiurl = dat.URL;
    var combtitle = "• " + authorlist + " (" + year + ") \"" +
        title + "\"" + " " + journal + ": " + "<a href=\"" + doiurl +
        "\" target=\"_blank\">" + doiurl + "</a>\n";
    console.log(combtitle);
    return combtitle
}

//// main DAG ////
attemptDAGButton = function() {
    
    if (dvselector.value != "" &
        ivselector.value != "") {
        const dagbutton = document.getElementById('createdagbutton');
        dagbutton.disabled = false;
    }
}

dvSelected = function() {

    canreachdv = reachableByNodes(allvars.indexOf(dvselector.value), edgeset)
    dvcanreach = reachableNodesGeneral(allvars.indexOf(dvselector.value), edgeset)
    updateNodeStatus();
    attemptDAGButton();
}
 

ivSelected = function() {

    canreachiv = reachableByNodes(allvars.indexOf(ivselector.value), edgeset)
    ivcanreach = reachableNodesGeneral(allvars.indexOf(ivselector.value), edgeset)
    updateNodeStatus();
    attemptDAGButton();
}

getNodesStatus = function(cnode, iv, dv) {
    if (iv == cnode) {
        return ("independent variable");
    }
    if (dv == cnode) {
        return ("dependent variable");
    }
    let riv = canreachiv.includes(cnode);
    let rdv = canreachdv.includes(cnode);
    let ivr = ivcanreach.includes(cnode);
    let dvr = dvcanreach.includes(cnode);
    if ((riv & ivr) | (rdv & dvr) | (dvr & riv)) {
        return ("loop");
    } else {
        if (riv & rdv) {
            return ("confounder");
        }
        if (ivr & rdv) {
            return ("mediator");
        }
        if(ivr & dvr) {
          return("collider");
        }
        if(ivr) {
          return("predicted by IV");
        }
        if (dvr) {
            return ("do not adjust");
        }
        if (rdv) {
            return ("DV predictor");
        }
        if (riv) {
            return ("IV predictor");
        }
        
        return ("irrelevant");
    }
}

blankNodeStatus = function() {
  
  for (var i = 0; i < nodestatus.length; i++) {
    nodestatus[i] = "blank";
  }
}

resetDVIVFilter = function() {
  
  dvselector.value = "";
  ivselector.value = "";
  showCurrentNetworkState();
}

updateNodeStatus = function() {
    if (dvselector.value == "" &
        ivselector.value == "") {
          blankNodeStatus();
          if(nodestatus.length==0) {
            for (var i = 0; i < combids.length; i++) {
              nodestatus[i] = "blank";
            }  
          }
          
    } else {
    nodestatus = [];

    
    let dv = combids[combvars.indexOf(dvselector.value)];
    let iv = combids[combvars.indexOf(ivselector.value)];
    
    for (var i = 0; i < combids.length; i++) {
        nodestatus[i] = getNodesStatus(combids[i], iv = iv, dv = dv);
    }
    var confounders = [];
    for (var i = 0; i < combids.length; i++) {
        if (nodestatus[i] == "confounder") {
            confounders.push(combids[i]);
        }
    }
    for (var i = 0; i < confounders.length; i++) {
        let cfreach = reachableNodesGeneral(confounders[i], currentedgeset);
        for (var j = 0; j < cfreach.length; j++) {
            if (canreachdv.includes(cfreach[j]) | canreachiv.includes(cfreach[j])) {
                nodestatus[cfreach[j]] = "confounder pathway";
            }
        }
    }
   
   
    }
    var allclusters = getAllClusters();
    var clusterednodestemp = [];
    for (var i = 0; i < allclusters.length; i++) {
      clusterednodestemp = clusterednodestemp.concat(network.getNodesInCluster(allclusters[i]));
      
      for (var j = 0; j < combids.length; j++) {
        if(combids[j]==allclusters[i]) {
          for (var k = 0; k < nodestatus.length; k++) {
            if(clusterednodestemp.includes(combids[k])) {
              nodestatus[k] = nodestatus[j];
            }
          }
        }
      }
    }
    
    /*
    
    
    
    
    
    for (var i = 0; i < nodestatus.length; i++) {
      if(clusterednodestemp.includes(combids[i])) {
         
      //!(combids[i].toString().search("cluster")==-1)
        console.log("Marking " + combids[i] + " as irrelevant")
        nodestatus[i] = "irrelevant";
      }
    }
    */
}

 getAllClusters = function() {
      let allcnodes = Object.entries(network.clustering.clusteredNodes);
      let allclusters = [];
      for (var i = 0; i < allcnodes.length; i++) {
        allclusters.push(allcnodes[i][1].clusterId);
      }
      allclusters = allclusters.filter(onlyUnique);
      return(allclusters);
    }

onlyUnique = function (value, index, array) {
    return array.indexOf(value) === index;
}


reachableByNodes = function(startnode, edgesetall) {
    var nodesreached = [];
    var nodestocheck = [startnode];
    var nodeschecked = [];
    var dist = 0;
    while (nodestocheck.length > 0) {
        dist = dist + 1;
        for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode = nodestocheck[i];
            if(!currentnode.search==null) {
              console.log("reachablebynodes: " + currentnode);
            }
            
            for (var j = 0; j < edgesetall.length; j++) {
                if (edgesetall[j].to == currentnode) {
                    if (!nodesreached.includes(edgesetall[j].from)) {
                        // adding new node to reached list
                        nodesreached.push(edgesetall[j].from);
                        if (!nodeschecked.includes(edgesetall[j].from) &
                            !nodestocheck.includes(edgesetall[j].from)) {
                            // adding new node to need to check list
                            nodestocheck.push(edgesetall[j].from);
                        }
                    }
                }
            }
            // removing currentnode from the nodestocheck list
            nodestocheck.splice(nodestocheck.indexOf(currentnode), 1);
            nodeschecked.push(currentnode);
        }
    }
    return nodesreached;
}

getEdges = function() {
    
    if(currentenv=="offline") {
      var studypromise = new Promise((resolve, reject) => {

         var studies = [{
               DOI: "12345",
               "x variable": "education",
               "y variable": "income",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "individual income tax",
               "y variable": "aggregate income tax",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "music",
               "y variable": "dancing",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "living in argentina",
               "y variable": "tango dancing",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "living in bolivia",
               "y variable": "bolivian tango dancing",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "revenue",
               "y variable": "smoking",
               finding: "positive"
            },
            {
               DOI: "12345",
               "x variable": "education",
               "y variable": "voting for economic right wing party",
               finding: "positive"
            },
            {
               DOI: "54321",
               "x variable": "years of schooling",
               "y variable": "voting for economic right wing party",
               finding: "positive"
            },
             {
               DOI: "243",
               "x variable": "years of schooling",
               "y variable": "snacks eaten per minute",
               finding: "positive"
            },
            {
               DOI: "54321",
               "y variable": "education",
               "x variable": "voting for economic right wing party",
               finding: "positive"
            },
            {
               DOI: "54321",
               "x variable": "education",
               "y variable": "voting for party",
               finding: "positive"
            },
            {
               DOI: "6789",
               "x variable": "smoking",
               "y variable": "cancer",
               finding: "positive"
            }
         ];
         resolve(studies);
      });
    }  else {
      const spreadsheetId = "11hfXFfdpMyDEeMSy3xeO3rsbI7a6UdcaJfJpZZlBJ34"
    const sheetId = 0;
    const sheetName = "causalclaims";
    const sheetInfo = {
        sheetId,
        sheetName
    }
    var studypromise  = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse()
    } 
    
    //setLoading()
    
    studypromise.then((items) => {
        console.table(items)
        currentitems = items;
        var edgecombs = [];
        for (var i = 0; i < currentitems.length; i++) {
            try {
                currentitems[i].DOI = cleanDOI(currentitems[i].DOI);
            } catch (error) {

            }

            allnodes.push(currentitems[i]["x variable"]);
            allnodes.push(currentitems[i]["y variable"]);
            currentitems[i].edgecomb = currentitems[i]["x variable"] + "|" + currentitems[i]["y variable"];
            edgecombs[i] = currentitems[i].edgecomb;
        }

        var uniqueedgecombs = edgecombs.filter(onlyUnique);
        var uniqueitems = [];
        for (var i = 0; i < uniqueedgecombs.length; i++) {
            let firstmatch = edgecombs.indexOf(uniqueedgecombs[i]);
            uniqueitems[i] = currentitems[firstmatch];

            for (var j = (firstmatch + 1); j < edgecombs.length; j++) {
                if (uniqueedgecombs[i] == edgecombs[j]) {
                    if (uniqueitems[i].finding != currentitems[j].finding) {
                        uniqueitems[i].finding = "mixed";
                    }
                    uniqueitems[i].DOI = uniqueitems[i].DOI + ";" + currentitems[j].DOI;
                    uniqueitems[i].resultdocposition = uniqueitems[i].resultdocposition + ";" + currentitems[j].resultdocposition;

                }
            }
            if (uniqueitems[i].finding == "positive") {
                uniqueitems[i].color = "green";
            }
            if (uniqueitems[i].finding == "negative") {
                uniqueitems[i].color = "red";
            }
            if (uniqueitems[i].finding == "zero") {
                uniqueitems[i].color = "gray";
            }
            if (uniqueitems[i].finding == "mixed") {
                uniqueitems[i].color = "purple";
            }
        }

        uniquenodes = allnodes.filter(onlyUnique);


       testEdgeChoice = function(values,
            id,
            selected,
            hovering) {
            if (selected) {
                values.strokeWidth = 3;
                values.width = 3;
                
                
                if (pubtext.edgeid != id) {
                  pubtext.edgeid = id;
                  
                  var edgenodes = network.getConnectedNodes(pubtext.edgeid)
                  
                  var xvar = nodeLabelFromId(edgenodes[0]);
                  var yvar = nodeLabelFromId(edgenodes[1]);
                  let studytitle = xvar + " 🡒 " + yvar
                  
                  document.getElementById("claimstudy").innerText = studytitle;
                  
                  
                  if(id.includes("cluster")) {
                    var doismulti = "";
                    var baseedgeids = network.clustering.getBaseEdges(id);
                    var baseedges = edges.get(baseedgeids);
                    for (var i = 0; i < baseedges.length; i++) {
                      if(baseedges[i].dois!=null) {
                        if(doismulti=="") {
                          doismulti = baseedges[i].dois;
                        } else {
                          doismulti = doismulti + ";" + baseedges[i].dois;
                        }
                      } 
                    }
                    if(doismulti != "") {
                      try{
                      let doistemp = doismulti.split(";");
                      doistemp = doistemp.filter(onlyUnique);
                      populateDOIList(doistemp);
                    } catch(error) {
                      clearStudyText();
                    }
                    }
                    
                  } else {
                    try{
                      let doistemp = edges.get(id).dois.split(";");
                      doistemp = doistemp.filter(onlyUnique);
                      populateDOIList(doistemp);
                    } catch(error) {
                      clearStudyText();
                    }
                    /*
                    var edgedata = edges.get();
                    for (var i = 0; i < edgedata.length; i++) {
                      if (edgedata[i].id == id) {
                        try{
                          let doistemp = edgedata[i].dois.split(";");
                          doistemp = doistemp.filter(onlyUnique);
                          populateDOIList(doistemp);
                        } catch(error) {
                          
                        }
                      }
                    }
                    */
                  }
                }
            }
            if(pubtext.innerHTML=="") {
              pubtext.innerHTML = "No citations listed";
            }
        }

        // creating edges
        for (var i = 0; i < uniqueitems.length; i++) {
            edgeset[i] = {
                from: allvars.indexOf(uniqueitems[i]["x variable"]),
                to: allvars.indexOf(uniqueitems[i]["y variable"]),
                relation: uniqueitems[i].finding,
                arrows: "to",
                color: {
                    color: uniqueitems[i].color
                },
                dois: uniqueitems[i].DOI,
                resultdocposition: uniqueitems[i].resultdocposition,
                chosen: {
                    label: false,
                    edge: testEdgeChoice
                },
            };
        }
        
        createNetwork();
        fetchAllCrossRef();
        showCurrentNetworkState();
    })
}
var notstarted = true;
createNetwork = function() {
    const nodeFilterSelector = document.getElementById("nodeFilterSelect");
    const edgeFilters = document.getElementsByName("edgesFilter");
    // setting nodes to be the ones from the hierarchy
    nodeset = nodesh;
    nodes = new vis.DataSet(nodeset);
    edges = new vis.DataSet(edgeset);
    
    const resetit = document.getElementById('resetbutton');
    //const filterit = document.getElementById('filterbutton');
    const dagbutton = document.getElementById('createdagbutton');
    dagbutton.disabled = true;
    //dvselector.disabled = true;
    //ivselector.disabled = true;
    //resetit.disabled = false;

    function startNetwork(data) {
        const container = document.getElementById("mynetwork");
        const options = {};
        network = new vis.Network(container, data, options);
    }

    let nodeFilterValue = "";
    const edgesFilterValues = {
        positive: true,
        negative: true,
        zero: false,
        mixed: true,
    };

    /*
    filter function should return true or false
    based on whether item in DataView satisfies a given condition.
    */
    
    const nodesFilter = (node) => {
      if(notstarted) {
        return true;
      }
        console.log("testing filter on " + node.label     );
        // temporary while testing:
        for (var i = 0; i < nodecount.length; i++) {
          var currentnodecount;
          if(nodeids[i]==node.id) {
            currentnodecount = nodecount[i];
          }
        }
        if(network!=null) {
          if(currentnodecount==0) {
            // note the issue
            return false;
          } else {
          if (nodestatus[combids.indexOf(node.id)] != "irrelevant") {
            return true;
        } else {
            console.log("Filtering out " + node.label);
            return false;
        }  
      }  
        } else {
          return true;
        }

        if (nodeFilterValue === "") {
            
        }
        switch (nodeFilterValue) {
            case "test":
                return node.attribute === "test";
            default:
                return true;
        }
    };

    const edgesFilter = (edge) => {
        return edgesFilterValues[edge.relation];
    };

    nodesView = new vis.DataView(nodes, {
        filter: nodesFilter
    });
    const edgesView = new vis.DataView(edges, {
        filter: edgesFilter
    });

    nodeFilterSelector.addEventListener("change", (e) => {
        // set new value to filter variable
        nodeFilterValue = e.target.value;
        /*
        refresh DataView,
        so that its filter function is re-calculated with the new variable
        */
        nodesView.refresh();
    });

    edgeFilters.forEach((filter) =>
        filter.addEventListener("change", (e) => {
            const {
                value,
                checked
            } = e.target;
            edgesFilterValues[value] = checked;
            edgesView.refresh();
        })
    );

    startNetwork({
        nodes: nodesView,
        edges: edgesView
    });
    console.log("network started");
    
    makeNodeCounts();
    notstarted = false;
    nodesView.refresh();
}

makeNodeCounts = function() {
   nodeids = nodes.getIds();
    
    for (var i = 0; i < nodeids.length; i++) {
      nodecount[i] = (network.getConnectedNodes(nodeids[i], "from").length + 
              network.getConnectedNodes(nodeids[i], "to").length);
    }
}

//// hierarchy ////

hideChildren = function(nodeid) {
    /*
    if (!foldednodes.includes(nodeid)) {
        foldednodes.push(nodeid);
    }
    */
    var parentlabel;
    let hidethese = reachableNodesGeneral(nodeid, edgesh);
    if (hidethese.length > 0) {
        
    }
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].id == nodeid) {
            nodesh[i].color = "#09e472";
            parentlabel = nodesh[i].label
        }
        /*
        if (hidethese.includes(i)) {
            hidden.push(i);
        }
        */
    }
    hidethese.push(nodeid);
    clusterNodes(nodeidstocluster = hidethese, 
      label = parentlabel, origid = nodeid);
    updateAllClusterEdges();
}

showChildren = function(nodeid) {
    
    let showthese = reachableNodesGeneral(nodeid, edgesh);
  

    for (var i = 0; i < nodesh.length; i++) {
        if (showthese.includes(i)) {
            //hidden.push(i);
            hidden.splice(hidden.indexOf(i));
        }
    }
    for (var i = 0; i < foldednodes.length; i++) {
        hideChildren(foldednodes[i]);
    }
    cdeletes = [];  
    for (var i = 0; i < clusterednodes.length; i++) {
      if(clusterednodes[i].origid==nodeid) {
        cdeletes.push(i);
        try{
          unclusterNodes(clusterednodes[i].id)  
        } catch(error) {
          
        }
      }
    }
    for(var i = cdeletes.length-1; i >= 0; i--){
      clusterednodes.splice(cdeletes[i], 1);
    }
}

getVariableHierarchy = function() {
    if(currentenv=="offline") {
      var varpromise = new Promise((resolve, reject) => {
         var dummyvars = [
            {
               "Variablename": "years of schooling",
               Parent: "education"
            },
             {
               "Variablename": "music",
               Parent: ""
            },
            {
               "Variablename": "dancing",
               Parent: ""
            },
              {
               "Variablename": "tango dancing",
               Parent: "dancing"
            },
            {
               "Variablename": "bolivian tango dancing",
               Parent: "tango dancing"
            },
            {
               "Variablename": "living in argentina",
               Parent: ""
            },
            {
               "Variablename": "living in bolivia",
               Parent: "association with bolivia"
            },
            {
               "Variablename": "association with bolivia",
               Parent: ""
            },
            {
               "Variablename": "living in hawaii",
               Parent: ""
            },
            {
               "Variablename": "snacks eaten per minute",
               Parent: ""
            },
            {
               "Variablename": "minutes of schooling",
               Parent: "years of schooling"
            },
           {
               "Variablename": "none",
               Parent: ""
            },
            {
               "Variablename": "education",
               Parent: ""
            },
            {
               "Variablename": "smoking",
               Parent: ""
            },
            {
               "Variablename": "cancer",
               Parent: ""
            },
           
            {
               "Variablename": "income",
               Parent: ""
            },
            {
               "Variablename": "individual income tax",
               Parent: "income tax"
            },
            {
               "Variablename": "aggregate income tax",
               Parent: "income tax"
            },
            {
               "Variablename": "income tax",
               Parent: ""
            },
            {
               "Variablename": "individual income",
               Parent: "income"
            },
            {
               "Variablename": "revenue",
               Parent: "income"
            },
            {
               "Variablename": "voting for economic right wing party",
               Parent: "voting for party"
            },
            {
               "Variablename": "voting for party",
               Parent: ""
            },
            {
               "Variablename": "not real data",
               Parent: ""
            }
         ]

         resolve(dummyvars);
      })
    } else {
    const spreadsheetId = "1JdIwj_x64L6rpEK48acjnctYfrzFIS5HBkb4s27S7L8";
    const sheetId = 0;
    const sheetName = "variables";
    const sheetInfo = {
        sheetId,
        sheetName
    }
    var varpromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse();
    }
    
    varpromise.then((items) => {
        var keep = [];
        for (var i = 0; i < items.length; i++) {
            if (!allvars.includes(items[i].Variablename)) {
              allvars.push(items[i].Variablename);
            }
            var badparent = false;
            if (typeof items[i].Parent === "undefined" ) {
              badparent = true;
            } else {
              if(items[i].Parent=="") {
                badparent = true;  
              }
            }
            
            if(!badparent) {
               if (!allvars.includes(items[i].Parent)) {
                allvars.push(items[i].Parent);
              }
              keep.push(i);
            }
          }
        
        for (var i = 0; i < allvars.length; i++) {
         allchildren[i] = [];
         for (var j = 0; j < items.length; j++) {
            if (items[j].Variablename == allvars[i]) {
               if(items[j].Parent==null) {
                 allparents[i]= "";
               } else {
                 allparents[i] = items[j].Parent;
               }
               
            }
            if (items[j].Parent == allvars[i]) {
              if(items[j].Variablename==null) {
                
              } else {
               allchildren[i].push(items[j].Variablename); 
              }
            }
         }
      }
        
        
        for (var i = 0; i < allvars.length; i++) {
          nodesh[i] = {id: (i), label: allvars[i]};
        }
        items = keep.map(i => items[i]);
        
        for (var i = 0; i < items.length; i++) {
          edgesh[i]=  {from: allvars.indexOf(items[i].Parent), to: allvars.indexOf(items[i].Variablename)};
        }
        
        inanyedge = function(nodeid) {
          for (var j = 0; j < edgesh.length; j++) {
            if(edgesh[j].from==i | edgesh[j].to==i) {
              return true;
            }
          }
          return false;
        }
        
        
        for (var i = 0; i < nodesh.length; i++) {
          if(!inanyedge(i)) {
              hidden.push(i)
            } 
        }
      
        //draw();
        getEdges();
        createListHierarchy();

      });
}



unclusterNodes = function(nodeid) {
    network.openCluster(nodeid);
    for (var i = 0; i < clusterednodes.length; i++) {
        /*
        if(clusterednodes[i].id==nodeid) {
          clusterednodes.splice(i, 1);
        }
        */
    }
    nodesView.refresh();
  }
    
   
    
getNextLevel = function(orid) {
  let nextlevel = [];
  for (var i = 0; i < edgesh.length; i++) {
    if(edgesh[i].from==orid) {
      nextlevel.push(edgesh[i].to);
    }
  }
  return nextlevel;
}

createNextLevel = function(currentorig) {
  let toplevel = document.createElement("li");
  toplevel.id = "node" + currentorig;
  let nextlev = getNextLevel(currentorig);
  if(nextlev.length>0) {
    let topspan = document.createElement("span");
    topspan.className = "caret";
    topspan.innerText = nodesh[currentorig].label ;
    topspan.id = "node" + currentorig;
    toplevel.appendChild(topspan);
    let  toplevellist = document.createElement("ul");
    toplevellist.className = "nested";
    toplevellist.id = "nodelist" + currentorig;
    
    for (var i = 0; i < nextlev.length; i++) {
      if(toplevellist.nextSibling) {
        toplevellist.ParentNode.insertBefore(createNextLevel(nextlev[i]), 
          toplevellist.nextSibling);  
      } else {
        toplevellist.appendChild(createNextLevel(nextlev[i]));  
      }
      
    }
    toplevel.appendChild(toplevellist);
    /*
    toplevel.addEventListener("click", function() {
      console.log(this.id);
      
    });
    */
  } else {
    toplevel.innerText =  nodesh[currentorig].label ;
  }
  return(toplevel);
}



createListHierarchy = function() {
  var originnodes = [];
        
  for (var i = 0; i < nodesh.length; i++) {
    if(reachableByNodes(i, edgesh).length==0) {
      if(reachableNodesGeneral(i, edgesh).length>0) {
        originnodes.push(i);  
      }
    }
  }

  for (var i = 0; i < originnodes.length; i++) {
    nestedvars.appendChild(createNextLevel(originnodes[i]));
  }
  var toggler = document.getElementsByClassName("caret");
  var i;
   for (i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener("click", function() {
      let tempid = Number(this.id.replace("node", ""));
      console.log(tempid);
      this.parentElement.querySelector(".nested").classList.toggle("active");
      this.classList.toggle("caret-down");
    
      showCurrentNetworkState();
    });
  }
  foldTopLevels();
  
  
}

nodeLabelFromId = function(id) {
for (var i = 0; i < combids.length; i++) {
  if(combids[i]==id) {
    return(combvars[i]);
  }
}  
}

makeEdgeTwoway = function(edge) {
    network.updateEdge(edge, {arrows: {from: {enabled: true}},
    color : "purple"} )
}

updateAllClusterEdges = function() {
  var clusternodestemp = [];
  for (var i = 0; i < clusterednodes.length; i++) {
    clusternodestemp[i] = clusterednodes[i].id;
  }

for (var i = 0; i < clusternodestemp.length; i++) {
  try {
    var basenodes = network.getNodesInCluster(clusternodestemp[i]);
    var clusteredges = network.getConnectedEdges(clusternodestemp[i]);
    
    for (var j = 0; j < clusteredges.length; j++) {
      try {
        var baseedgeids = network.getBaseEdges(clusteredges[j]);
        var baseedges = edges.get(baseedgeids);
        var anyto = false;
        var anyfrom = false;
        for (var k = 0; k < baseedges.length; k++) {
          if(basenodes.includes(baseedges[k].from)) {
            anyfrom = true;
          }
          if(basenodes.includes(baseedges[k].to)) {
            anyto = true;
          }
        }
        
        if(anyfrom & anyto) {
          makeEdgeTwoway(clusteredges[j]);
        }
        
        } catch (e) {
          console.log(e);
        }
    }
    } catch(e2) {
      console.log(e2);
    }
  }
}

updateFoldedList= function(component) {
  notstarted= true;
  nodesView.refresh();
  var foldeddown = false;
  if(component.children!=null) {
    if(component.children[0]!=null) {
    if(component.children[0].classList!=null) {
   if(component.children[0].classList.value=='caret caret-down') {
      foldeddown = true;
     }   
    }
    }
  }
  if(foldeddown) {
    var run = true;
    console.log("folded: " + component.children[0].innerText);
    for (var j = 0; j < nodesh.length & run; j++) {
      if(nodesh[j].label==component.children[0].innerText) {
        foldednodes.push(nodesh[j].id);
        run = false;
      }
    }
  } else {
    if(component.children.length==0) {
      return null;
    }
    console.log("unfolded: ");
    console.log( component);

    if(component.children[1].children.length>0) {
      for (var i = 0; i < component.children[1].children.length; i++) {
        updateFoldedList(component.children[1].children[i]);
      }
    }
  }
  notstarted = false;
}

findFoldedNodes = function() {
 foldednodes = [];
 // toplevel iteration
  for (var i = 0; i < nestedvars.children.length; i++) {
    updateFoldedList(nestedvars.children[i]);
  } 
}



findVariableIdFromLabel = function(label) {
  for (var i = 0; i < combvars.length; i++) {
    if(combvars[i]==label) {
      return(combids[i]);
    }
  }
  return(-1)
}

findVariableInOriginalNodes = function(label) {
  var allnodestemp = nodes.get();
  for (var i = 0; i < allnodestemp.length; i++) {
    if(allnodestemp[i].label==label) {
      return(allnodestemp[i])
    }
  }
  return(-1)
}