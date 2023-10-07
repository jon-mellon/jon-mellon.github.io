
/*
// testing code for getNodeStatus:

var dv = findVariableIdFromLabel(dvselector.value);
var iv = findVariableIdFromLabel(ivselector.value);
var cnode = "cluster4"
var cnode = findVariableIdFromLabel("education");
getNodeStatus(cnode, iv, dv)
dvcanreach = reachableNodeOrParent(dv, currentedgeset);
dvcanreach2 = reachableNodeOrParent(dv, edgeset);
*/

getDOIMulti = function(id) {
  var doismulti = "";
  var baseedgeids = network.clustering.getBaseEdges(id);
  var baseedges = origedges.get(baseedgeids);
  for (var i = 0; i < baseedges.length; i++) {
    if (baseedges[i].dois != null) {
      if (doismulti == "") {
        doismulti = baseedges[i].dois;
      } else {
        doismulti = doismulti + ";" + baseedges[i].dois;
      }
    }
  }
  return(doismulti);
}

showVariableHeaders = function() {
    document.getElementById("parentlist").innerHTML = "";
    document.getElementById("childlist").innerHTML = "";
    document.getElementById("parenttitle").hidden = false;
    document.getElementById("childtitle").hidden = false;
    document.getElementById("parentlist").hidden = false;
    document.getElementById("childlist").hidden = false;
    document.getElementById("varname").hidden = false;
    document.getElementById("parentbutton").hidden = true;
    document.getElementById("childbutton").hidden = true;
    document.getElementById("childrecallbutton").hidden = true;
}

hideVariableHeaders = function() {
    document.getElementById("parentlist").innerHTML = "";
    document.getElementById("childlist").innerHTML = "";
    document.getElementById("parenttitle").hidden = true;
    document.getElementById("childtitle").hidden = true;
    document.getElementById("parentlist").hidden = true;
    document.getElementById("childlist").hidden = true;
    document.getElementById("varname").hidden = true;
    document.getElementById("parentbutton").hidden = true;
    document.getElementById("childbutton").hidden = true;
    document.getElementById("childrecallbutton").hidden = true;

}

foldTopLevels = function() {
    var toplevids = [];
    for (var i = 0; i < nestedvars.children.length; i++) {
        toplevids.push(nestedvars.children[i].id);
    }
    var toggler = document.getElementsByClassName("caret");
    for (var i = 0; i < toggler.length; i++) {
        toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
        toggler[i].classList.toggle("caret-down");

    }
}




DOIChecker = function(doi) {
    for (var i = 0; i < currentitems.length; i++) {
        if (currentitems[i].DOI != null) {
            if (currentitems[i].DOI.toLowerCase() == doi.toLowerCase()) {
                return true;
            }
        }
    }
    return false;
}

setSize = function(x) {
    var sizerunning = true;
    var size = 0;
    while (sizerunning) {

        if (x[size] == null) {
            sizerunning = false;
        }
        size = size + 1
    }
    return (size);
}




unclusterAllNodes = function() {
    let allclusters = getAllClusters(network);

    for (var i = 0; i < allclusters.length; i++) {
        try {
            //console.log("Unclustering:" + allclusters[i]);
            network.openCluster(allclusters[i].id);
        } catch (e) {

        }
    }
}

unclusterSpecificNodes = function(touncluster) {
    for (var i = 0; i < touncluster.length; i++) {
        try {
            //console.log("Unclustering:" + allclusters[i]);
            network.openCluster(touncluster[i]);
        } catch (e) {

        }
    }
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
    var allclusters = getAllClusters(network);
    for (var i = 0; i < hidethese.length; i++) {
      var hidelabel = nodeLabelFromIdh(hidethese[i]);
      for (var j = 0; j < allclusters.length; j++) {
        if((allclusters[j].label==hidelabel) & 
          hidelabel!="") {
          try{
            //console.log("Success: " + allclusters[j].id + " " + allclusters[j].label);
            network.openCluster(allclusters[j].id);
          } catch(e) {
            //console.log(allclusters[j].id + allclusters[j].label) ;
            //console.log(e);
          }
        }
      }
    }
    
    console.log("cluster: " + parentlabel+ " nodes:" + hidethese);
    clusterNodes2(nodeidstocluster = hidethese,
        label = parentlabel, origid = nodeid);
    //updateAllClusterEdges();
}



clusterNodes2 = function(nodeidstocluster, label, origid) {
    // performance: this function is a major bottleneck
    let clusterid = "cluster" + (clusterednodes.length + 1);
    network.cluster({
        joinCondition(nodeOptions) {
            if (nodeidstocluster.includes(nodeOptions.id)) {
                return true;
            } else {
                return false;
            }
        },
        clusterNodeProperties: {
            id: clusterid,
            borderWidth: 4,
            //color: "#09e472",
            label: label,
            allowSingleNodeCluster: true,
        }
    });

    clusterednodes.push({
        id: clusterid,
        origid: origid,
        label: label
    });
}


unclusterUnfoldedNodes = function() {
  let allclusters = getAllClusters(network);
  for (var i = 0; i < allclusters.length; i++) {
      var clusterlabel = allclusters[i].label;
      var uncluster = true;
      for (var j = 0; j < foldednodes.length; j++) {
        if(foldednodes[j].label==clusterlabel) {
          uncluster = false;
        }
      }
      if(uncluster) {
        try {
          //console.log("Unclustering:" + allclusters[i]);
          network.openCluster(allclusters[i].id);
        } catch (e) {

        }  
      }
  }
}

clusterFoldedNodes = function() {
    
    // this function clusters everything in the foldednodes array
    var allclusters = getAllClusters(network);
    for (var i = 0; i < foldednodes.length; i++) {
      var cluster = true;
      for (var j = 0; j < allclusters.length; j++) {
        if(allclusters[j].label==foldednodes[i].label) {
          cluster = false;
        }
      }
      if(cluster) {
        hideChildren2(foldednodes[i].id);
      }
    }
    updateAllClusterEdges();
}

currentNetworkEdgeSet = function(currentnetwork) {
    // create currentedgeset from the visible network
    currentedgeset = [];
    for (var i = 0; i < currentnetwork.body.edgeIndices.length; i++) {
        currentedgeset[i] = {
            from: currentnetwork.body.edges[currentnetwork.body.edgeIndices[i]].fromId,
            to: currentnetwork.body.edges[currentnetwork.body.edgeIndices[i]].toId
        };
    }
    createCurrentvardet();
}

createCurrentvardet = function() {
    currentvardet = [];
    var currentids = network.body.nodeIndices;
    for (var i = 0; i < currentids.length; i++) {
        let currentvar = network.body.nodes[currentids[i]].options.label;
        currentvardet[i] = {
            id: currentids[i],
            label: currentvar,
            status: "blank",
            count: 1,
            parent: getParentFromLabel(currentvar),
        };
    }

    let origids = orignodes.getIds();
    let origvardet = [];
    for (var i = 0; i < origids.length; i++) {
        origvardet[i] = {
            id: origids[i],
            label: allvars[origids[i]],
            status: "blank",
            count: 1,
            parent: allparents[origids[i]],
        };
    }

    combids = currentids;
    combvardet = currentvardet;
    //combparents = [];
    for (var i = 0; i < origids.length; i++) {
        if (!currentids.includes(origids[i])) {
            combids.push(origids[i]);

            combvardet.push(origvardet[i]);
            //combparents.push(origparents[i]);
        }
    }
}


sfb = function() {
    showFilterBoxes();
}


calculateReachabilities = function() {
      // calculate reachabilities from currentedgeset
    var ivselectorindex = findVariableIdFromLabel(ivselector.value);
    var dvselectorindex = findVariableIdFromLabel(dvselector.value);

    if (dvselectorindex != null && dvselectorindex!=-1) {
        dvchildren = reachableNodesGeneral(dvselectorindex, edgesh);
        dvparents = reachableByNodes(dvselectorindex, edgesh);
        var dvcomb = dvchildren.concat(dvparents);
        
        canreachdv = reachableByNodeOrParent(dvselectorindex, currentedgeset, network);
        canreachdv2 = reachableByNodeOrParent(dvselectorindex, edgeset, network);
        canreachdv = canreachdv.concat(canreachdv2);
        dvcanreach = reachableNodeOrParent(dvselectorindex, currentedgeset);
        dvcanreach2 = reachableNodeOrParent(dvselectorindex, edgeset);
        dvcanreach = dvcanreach.concat(dvcanreach2);
        
        for (var i = 0; i < dvcomb.length; i++) {
          canreachdv = canreachdv.concat(reachableByNodeOrParent(dvcomb[i], currentedgeset, network));
          canreachdv = canreachdv.concat(reachableByNodeOrParent(dvcomb[i], edgeset, network));
          dvcanreach = dvcanreach.concat(reachableNodeOrParent(dvcomb[i], currentedgeset));
          dvcanreach = dvcanreach.concat(reachableNodeOrParent(dvcomb[i], edgeset));
        }
        
        canreachdv = canreachdv.filter(onlyUnique);
        dvcanreach = dvcanreach.filter(onlyUnique);
        
    } else {
        dvcanreach = [];
        canreachdv = [];
        dvchildren = [];
        dvparents = [];
    }
    if (ivselectorindex != null && ivselectorindex!=-1) {
        ivchildren = reachableNodesGeneral(ivselectorindex, edgesh);
        ivparents = reachableByNodes(ivselectorindex, edgesh);
        var ivcomb = ivchildren.concat(ivparents);

        
        canreachiv = reachableByNodeOrParent(ivselectorindex, currentedgeset, network);
        canreachiv2 = reachableByNodeOrParent(ivselectorindex, edgeset, network);
        canreachiv = canreachiv.concat(canreachiv2);
        
        ivcanreach = reachableNodeOrParent(ivselectorindex, currentedgeset);
        ivcanreach2 = reachableNodeOrParent(ivselectorindex, edgeset);
        ivcanreach = ivcanreach.concat(ivcanreach2);
        
         
        for (var i = 0; i < ivcomb.length; i++) {
          canreachiv = canreachiv.concat(reachableByNodeOrParent(ivcomb[i], currentedgeset, network));
          canreachiv = canreachiv.concat(reachableByNodeOrParent(ivcomb[i], edgeset, network));
          ivcanreach = ivcanreach.concat(reachableNodeOrParent(ivcomb[i], currentedgeset));
          ivcanreach = ivcanreach.concat(reachableNodeOrParent(ivcomb[i], edgeset));
        }
        
        canreachiv = canreachiv.filter(onlyUnique);
        ivcanreach = ivcanreach.filter(onlyUnique);
        
    } else {
        canreachiv = [];
        ivcanreach = [];
        ivchildren = [];
        ivparents = [];
    }
  }

showCurrentNetworkState = function() {
    // show all nodes
    blankNodeStatus();
    // read variable clustering from list
    findFoldedNodes();

    // uncluster all nodes
    //unclusterAllNodes();
    unclusterUnfoldedNodes();

    // foldednodes now contains the current state of the list
    // apply variable clustering
    clusterFoldedNodes();
    // create currentedgeset from current network
    currentNetworkEdgeSet(network);
    
    calculateReachabilities();

    updateNodeStatus();

    makeNodeCounts();

    makeNodeCounts();

    updateNodeStatus();
    nodesView.refresh();
    //createEdgeTable();
    createEdgeTable();
    //setTimeout(createEdgeTable, 1000);

}
var firstedgetable = true;

reachableNodeOrParent = function(startnode, edgesetall) {
    // reachable self
    var allreachable = reachableNodesGeneral(startnode, edgesetall);


    var allclusters = getAllClusters(network);
    for (var i = 0; i < allclusters.length; i++) {
        var tempclusternodes = network.getNodesInCluster(allclusters[i].id);
        if (tempclusternodes.includes(startnode)) {
            // reachable parent
            for (var j = 0; j < tempclusternodes.length; j++) {
                allreachable = allreachable.concat(reachableNodesGeneral(tempclusternodes[j], edgesetall));
            }
            allreachable = allreachable.concat(reachableNodesGeneral(allclusters[i].id, edgesetall));
            
        }
    }
    if(getParent(startnode)!="") {
      allreachable = allreachable.concat(reachableNodesGeneral(getParent(startnode), edgesetall));  
    }
    
    
    // reachable child?

    return (allreachable)
}

openListToLevel = function(cnode) {
  
}

reachableByNodeOrParent = function(startnode, edgesetall, currentnetwork) {
    var allreachable = reachableByNodes(startnode, edgesetall);
    var allclusters = getAllClusters(currentnetwork);
    
    // if startnode is in a cluster, add any variables that nodes within that 
    // cluster can reach to the reachable array. 
    // Also add in any variables that the cluster itself can reach
    for (var i = 0; i < allclusters.length; i++) {
        var tempnodesincluster = currentnetwork.getNodesInCluster(allclusters[i].id);
        if (tempnodesincluster.includes(startnode)) {
            for (var j = 0; j < tempnodesincluster.length; j++) {
                allreachable = allreachable.concat(reachableByNodes(tempnodesincluster[j], edgesetall));
            }
            allreachable = allreachable.concat(reachableByNodes(allclusters[i].id, edgesetall));
        }
    }
    allreachable = allreachable.concat(reachableByNodes(startnode, edgesetall));
    allreachable = allreachable.filter(onlyUnique);
    return (allreachable)
}

//// general network ////
reachableNodesGeneral = function(startnode, edgesetall) {
    // which nodes can this node reach
    var nodesreached = [];
    var nodestocheck = [startnode];
    var nodeschecked = [];
    var dist = 0;
    while (nodestocheck.length > 0) {
        dist = dist + 1;
        for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode = nodestocheck[i];
            if (!currentnode.search == null) {
                //console.log("reachablebynodes: " + currentnode);
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
    nodesreached = nodesreached.filter(onlyUnique);
    return nodesreached;
}
citationPresent = function(doi) {
    for (var i = 0; i < citations.length; i++) {
        if (citations[i].DOI == doi.toLowerCase()) {
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

    if (citationPresent(doi)) {
        for (var i = 0; i < citations.length; i++) {
            if (citations[i].DOI == doi.toLowerCase()) {
                pubtext.innerHTML = pubtext.innerHTML + "<br>" + formatArticle(citations[i]);
            } else {

            }
        }
    }

}

getDOIFromCrossRef = function(doi) {
    if (currentenv != "offline") {
        var doipromise = fetch("https://api.crossref.org/works/" + doi)
            .then((response) => {
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
                    DOI: doi,
                }
            };
            resolve(studytemp);
        }).then((response) => {
            return response;
        });
    }
    doipromise.then(data => {
            //console.log(data);
            if (!citationPresent(doi)) {
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
                try{
                  createEdgeTable();
                } catch(e) {
                  
                }
            }
        })
        .catch((error) => console.error("FETCH ERROR:", error));
}

getAllDOIS = function() {
    //console.log("getAllDOIS called");
    var alldois = [];
    for (var i = 0; i < edgeset.length; i++) {

        if (typeof edgeset[i].dois !== "undefined") {
            let tempdois = edgeset[i].dois.split(";");
            for (var j = 0; j < tempdois.length; j++) {
                alldois.push(tempdois[j]);
            }
        }
    }
    alldois = alldois.filter(onlyUnique);
    return (alldois)
}


fetchAllCrossRef = function() {
    var alldois = getAllDOIS();
    for (var i = 0; i < alldois.length; i++) {
        setTimeout(getDOIFromCrossRef, i * 100, alldois[i]);
    }
}

populateDOIList = function(dois) {
    clearStudyText();
    for (var i = 0; i < dois.length; i++) {
        populateCiteFromDOI(dois[i]);
    }
    if (pubtext.innerHTML == "") {
        pubtext.innerHTML = "No reference listed";
    }
}

cleanDOI = function(doi) {
    doi = doi.replace("https://doi.org/", "");
    doi = doi.replace("http://doi.org/", "");
    doi = doi.replace("doi.org/", "");
    doi = doi.replace("www.doi.org/", "");
    return (doi)
}


//// main DAG ////
attemptDAGButton = function() {

    if (dvselector.value != "" &
        ivselector.value != "") {
        const dagbutton = document.getElementById('createdagbutton');
        dagbutton.disabled = false;
    }
}


getParentFromLabel = function(nodelabel) {
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].label == nodelabel) {
            return (nodesh[i].parent);
        }
    }
    return ("");
}

getParent = function(nodeid) {
    for (var i = 0; i < combvardet.length; i++) {
        if (combvardet[i].id == nodeid) {
            return (combvardet[i].parent);
        }
    }
    return ("");
}


ts = function(scenario = 1) {
  if(scenario ==1 ) {
    sfb();
    ivselector.value = "income";
    dvselector.value = "years of schooling";
    showCurrentNetworkState();    
  }
  if(scenario ==2 ) {
    sfb();
    ivselector.value = "income";
    dvselector.value = "minutes of schooling";
    showCurrentNetworkState();    
  }
}

getNodeStatus = function(cnode, iv, dv) {
    // cnode, iv and dv are all ids variables
    if (iv == cnode) {
        makeNodeOrange(cnode);
        return ("independent variable");
    }
    if (dv == cnode) {
        makeNodeOrange(cnode);
        return ("dependent variable");
    }
    
    var ivlabel = findVariableLabelFromId(iv);
    var cparent = getParent(cnode);

    if (cparent == ivlabel & ivlabel != "") {
        makeNodeOrange(cnode);
        return ("independent variable");
    }
    var dvlabel = findVariableLabelFromId(dv);
    if (cparent == dvlabel & dvlabel != "") {
        makeNodeOrange(cnode);
        return ("dependent variable");
    }
    
    
    var clabel = findVariableLabelFromId(cnode);
    
    //var dvparent = getParent(dv);
    
    if(clabel!=""){
    for (var i = 0; i < dvparents.length; i++) {
      if(clabel==findVariableLabelFromId(dvparents[i])) {
        makeNodeOrange(cnode);
        return ("dependent variable");
      }
    }
    for (var i = 0; i < dvchildren.length; i++) {
      if(clabel==findVariableLabelFromId(dvchildren[i])) {
        makeNodeOrange(cnode);
        return ("dependent variable");
      }
    }
    for (var i = 0; i < ivparents.length; i++) {
      if(clabel==findVariableLabelFromId(ivparents[i])) {
        makeNodeOrange(cnode);
        return ("dependent variable");
      }
    }
    for (var i = 0; i < ivchildren.length; i++) {
      if(clabel==findVariableLabelFromId(ivchildren[i])) {
        makeNodeOrange(cnode);
        return ("dependent variable");
      }
    }
    }
    

    let riv = canreachiv.includes(cnode);
    let rdv = canreachdv.includes(cnode);
    let ivr = ivcanreach.includes(cnode);
    let dvr = dvcanreach.includes(cnode);
    
    if ((riv && ivr) || (rdv && dvr) || (dvr && riv)) {
        makeNodeBoring(cnode);
        return ("loop");
    }
    if (riv && rdv) {
        makeNodeRed(cnode);
        return ("confounder");
    }
    if (ivr && rdv) {
        makeNodeBoring(cnode);
        return ("mediator");
    }
    if (ivr && dvr) {
        makeNodeBoring(cnode);
        return ("collider");
    }
    if (ivr) {
        makeNodeBoring(cnode);
        return ("predicted by IV");
    }
    if (dvr) {
        makeNodeBoring(cnode);
        return ("do not adjust");
    }
    if (rdv) {
        makeNodeBoring(cnode);
        return ("DV predictor");
    }
    if (riv) {
        makeNodeBoring(cnode);
        return ("IV predictor");
    }
    makeNodeBoring(cnode);
    return ("irrelevant");
}

blankNodeStatus = function() {
    for (var i = 0; i < combvardet.length; i++) {
        combvardet[i].status = "blank";
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
        if (combvardet.length == 0) {
            for (var i = 0; i < combvardet.length; i++) {
                combvardet[i].status = "blank";
            }
        }

    } else {
        var dv = -1;
        var iv = -1;
        if (dvselector.value != "") {
            dv = findVariableIdFromLabel(dvselector.value);
        }
        if (ivselector.value != "") {
            iv = findVariableIdFromLabel(ivselector.value);
        }

        
        for (var i = 0; i < combvardet.length; i++) {
            combvardet[i].status = getNodeStatus(combvardet[i].id,
                iv = iv, dv = dv);
        }
        network.redraw();
        var confounders = [];
        for (var i = 0; i < combvardet.length; i++) {
            var vardettemp = combvardet[i];
            if (vardettemp.status == "confounder") {
                confounders.push(vardettemp.id);
            }
        }
        //console.log(confounders);
        if(confounders.length>0) {
        for (var i = 0; i < confounders.length; i++) {
            let cfreach = reachableNodesGeneral(confounders[i], currentedgeset);
            for (var j = 0; j < cfreach.length; j++) {
                if (canreachdv.includes(cfreach[j]) | canreachiv.includes(cfreach[j])) {
                    for (var k = 0; k < combvardet.length; k++) {
                      if(combvardet[k].id==cfreach[j]) {
                        combvardet[k].status = "confounder pathway";
                      }
                    }
                }
            }
        }  
        }
        


    }


    var allclusters = getAllClusters(network);
    var clusterstatus = [];
    for (var i = 0; i < allclusters.length; i++) {
        for (var j = 0; j < combvardet.length; j++) {
            if (allclusters[i].id == combvardet[j].id) {
                clusterstatus[i] = combvardet[j].status;
            }
        }
    }
    for (var i = 0; i < allclusters.length; i++) {
        var clusternodestemp = network.getNodesInCluster(allclusters[i].id);
        for (var j = 0; j < combvardet.length; j++) {
            if (clusternodestemp.includes(combvardet[j].id)) {
                combvardet[j].status = clusterstatus[i];
            }
        }
    }
}

getAllClusters = function(currentnetwork) {
    let allcnodes = Object.entries(currentnetwork.clustering.clusteredNodes);

    var allclusters = [];
    var allclids = [];
    for (var i = 0; i < allcnodes.length; i++) {
      if(!allclids.includes(allcnodes[i][1].clusterId)) {
        allclusters.push({id: allcnodes[i][1].clusterId, 
          label: network.body.nodes[allcnodes[i][1].clusterId].options.label
        });
        allclids.push(allcnodes[i][1].clusterId);
        }
      }
    allclusters = allclusters.filter(onlyUnique);
    return (allclusters);
}


onlyUnique = function(value, index, array) {
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
            if (!currentnode.search == null) {
                //console.log("reachablebynodes: " + currentnode);
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
    nodesreached = nodesreached.filter(onlyUnique);
    return nodesreached;
}

getEdges = function() {

    if (currentenv == "offline") {
        var studypromise = new Promise((resolve, reject) => {

            var studies = [{
                    DOI: "12345A",
                    "x variable": "education",
                    "y variable": "income",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345a",
                    "x variable": "performance anxiety",
                    "y variable": "performance",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345c",
                    "x variable": "performance",
                    "y variable": "social anxiety",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345",
                    "x variable": "individual income tax",
                    "y variable": "aggregate income tax",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345",
                    "x variable": "music",
                    "y variable": "dancing",
                    "instrument": "rainfall",
                    finding: "positive"
                },
                {
                    DOI: "12345",
                    "x variable": "living in argentina",
                    "y variable": "tango dancing",
                    "instrument": "",
                    finding: "non-monotonic"
                },
                {
                    DOI: "12345",
                    "x variable": "living in bolivia",
                    "y variable": "bolivian tango dancing",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345",
                    "x variable": "revenue",
                    "y variable": "smoking",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "12345",
                    "x variable": "education",
                    "y variable": "voting for economic right wing party",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "54321",
                    "x variable": "years of schooling",
                    "y variable": "voting for economic right wing party",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "243",
                    "x variable": "snacks eaten per minute",
                    "y variable": "years of schooling",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "243",
                    "x variable": "snacks eaten per minute",
                    "y variable": "income",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "244",
                    "x variable": "snacks eaten per minute",
                    "y variable": "voting for economic right wing party",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "54321",
                    "y variable": "education",
                    "x variable": "voting for economic right wing party",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "54321",
                    "x variable": "education",
                    "y variable": "voting for party",
                    "instrument": "",
                    finding: "positive"
                },
                {
                    DOI: "6789",
                    "x variable": "smoking",
                    "y variable": "cancer",
                    "instrument": "",
                    finding: "positive"
                }
            ];
            resolve(studies);
        });
    } else {
        const spreadsheetId = "11hfXFfdpMyDEeMSy3xeO3rsbI7a6UdcaJfJpZZlBJ34"
        const sheetId = 0;
        const sheetName = "causalclaims";
        const sheetInfo = {
            sheetId,
            sheetName
        }
        var studypromise = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo).parse()
    }

    studypromise.then((items) => {
        console.table(items)
        currentitems = items;
        var edgecombs = [];
        for (var i = 0; i < currentitems.length; i++) {
            try {
                currentitems[i].DOI = cleanDOI(currentitems[i].DOI);
            } catch (error) {
                console.log(error);
            }

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
            if (uniqueitems[i].finding == "non-monotonic") {
                uniqueitems[i].color = "purple";
            }
            if (uniqueitems[i].finding == "heterogeneous") {
                uniqueitems[i].color = "purple";
            }
        }




        testEdgeChoice = function(values,
            id,
            selected,
            hovering) {
            if (selected) {
                values.strokeWidth = 3;
                values.width = 3;


                if (pubtext.edgeid != id) {
                    pubtext.edgeid = id;

                    var edgenodes = network.getConnectedNodes(pubtext.edgeid);

                    var xvar = findVariableLabelFromId(edgenodes[0]);
                    var yvar = findVariableLabelFromId(edgenodes[1]);
                    openTab("buttonviewertab", 'viewertab');
                    hideVariableHeaders();
                    document.getElementById("studytitle").innerText = "Studies";
                    document.getElementById("claimstudy").innerText = "";
                    clearStudyText();

                    let studytitle = xvar + " 🡒 " + yvar;

                    document.getElementById("claimstudy").innerText = studytitle;


                    if (id.includes("cluster")) {
                        var doismulti = getDOIMulti(id);
                        if (doismulti != "") {
                            try {
                                let doistemp = doismulti.split(";");
                                doistemp = doistemp.filter(onlyUnique);
                                populateDOIList(doistemp);
                            } catch (error) {
                                clearStudyText();
                            }
                        }

                    } else {
                        try {
                            let doistemp = origedges.get(id).dois.split(";");
                            doistemp = doistemp.filter(onlyUnique);
                            populateDOIList(doistemp);
                        } catch (error) {
                            clearStudyText();
                        }

                    }
                }
            }
            if (pubtext.innerHTML == "") {
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

        for (var i = 0; i < uniqueitems.length; i++) {
            if (uniqueitems[i]["instrument"] != "") {
                let ivedge = {
                    from: allvars.indexOf(uniqueitems[i]["instrument"]),
                    to: allvars.indexOf(uniqueitems[i]["x variable"]),
                    relation: "first-stage",
                    arrows: "to",
                    color: {
                        color: "purple"
                    },
                    dois: uniqueitems[i].DOI,
                    resultdocposition: uniqueitems[i].resultdocposition,
                    chosen: {
                        label: false,
                        edge: testEdgeChoice
                    },
                };
                edgeset.push(ivedge);
            }

        }


        createNetwork();
        fetchAllCrossRef();
        createListHierarchy();
        showCurrentNetworkState();
    })
}
var notstarted = true;
createNetwork = function() {
    const nodeFilterSelector = document.getElementById("nodeFilterSelect");
    const edgeFilters = document.getElementsByName("edgesFilter");
    // setting nodes to be the ones from the hierarchy

    orignodes = new vis.DataSet(nodesh);
    origedges = new vis.DataSet(edgeset);

    const resetit = document.getElementById('resetbutton');
    const dagbutton = document.getElementById('createdagbutton');
    dagbutton.disabled = true;

    function startNetwork(data) {
        const container = document.getElementById("mynetwork");
        const options = {
            interaction: {
                selectConnectedEdges: false
            },
            layout: {
              randomSeed: 191006,
              improvedLayout: false
            },
            nodes: {
              borderWidth:0
            },
            physics:{
              stabilization: false
            }
        };
        
        
        network = new vis.Network(container, data, options);

        network.on('selectNode', function(properties) {
                openTab("buttonviewertab", 'viewertab');
                clearStudyText();
                showVariableHeaders();
                document.getElementById("studytitle").innerText = "Variable";
                document.getElementById("claimstudy").innerText = "";

                document.getElementById("varname").innerText = findVariableLabelFromId(properties.nodes);

                for (var i = 0; i < allvars.length; i++) {
                    if (allvars[i] == findVariableLabelFromId(properties.nodes)) {
                        var childtext = "";
                        //console.log(properties);

                        if (allchildren[i].length > 0) {
                            for (var j = 0; j < allchildren[i].length; j++) {
                                childtext = childtext + "• " + allchildren[i][j] + "\n";
                            }
                            document.getElementById("childlist").innerText = childtext;
                            if (properties.nodes[0].toString().includes("cluster")) {
                                document.getElementById("childbutton").hidden = false;
                            } else {
                                document.getElementById("childrecallbutton").hidden = false;
                            }
                        }
                      if (allparents[i] != "") {
                        document.getElementById("parentlist").innerText = "• " + allparents[i];
                        document.getElementById("parentlist").currentparent = allparents[i];
                        document.getElementById("parentbutton").hidden = false;
                      }
                    }
                }
          });
}

let nodeFilterValue = "";
const edgesFilterValues = {
    positive: true,
    negative: true,
    "first-stage": true,
    heterogeneous: true,
    "non-monotonic": true,
    zero: false,
    mixed: true,
};

isNodeClustered = function(node) {
      var nodereach = reachableByNodes(node.id, edgesh);
      var allclusters = getAllClusters(network);
        for (var i = 0; i < nodereach.length; i++) {
          for (var j = 0; j < allclusters.length; j++) {
            if(allclusters[j].label==nodeLabelFromIdh(nodereach[i])) {
              for (var k = 0; k < combvardet.length; k++) {
                if(combvardet[k].id==node.id && combvardet[k].count==0) {
                  return false;
                }
              }
              return true;
            }
          }
        }
        return true;
    }
const nodesFilter = (node) => {
    if (nofilter) {
        return true;
    }
    if (notstarted) {
        return true;
    }
    if (ivselector.value == node.label) {
          return isNodeClustered(node);
    }
    if (dvselector.value == node.label) {
          return isNodeClustered(node);
    }
    if(ivparents.includes(node.id) || 
        dvparents.includes(node.id) || 
        ivchildren.includes(node.id) || 
        dvchildren.includes(node.id) ) {
      return isNodeClustered(node);
    }
    
    if (node.parent != null & node.parent != "") {
        if (ivselector.value == node.parent) {
          return isNodeClustered(node);
        }
        if (dvselector.value == node.parent) {
          return isNodeClustered(node);
        }
      }
    var currentnodecount;
    // temporary while testing:
    for (var i = 0; i < nodecount.length; i++) {
        if (nodecount[i].id == node.id) {
            currentnodecount = nodecount[i].count;
        }
    }
    if (currentnodecount==null) {
      for (var i = 0; i < combvardet.length; i++) {
        if(combvardet[i].id==node.id) {
          currentnodecount = combvardet[i].count;
        }
      }
    }
    if (network != null) {
        if (currentnodecount == 0) {
            return false;
        } else {
            if (typeof combvardet[combids.indexOf(node.id)] == "undefined") {
                return true;
            }
            if (combvardet[combids.indexOf(node.id)].status != "irrelevant") {
                return true;
            } else {
                //  console.log("rejected for nodestatus of irrelevant: " + node.label);
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
const nodesFilter2 = (node) => {
  return true;
};

const edgesFilter = (edge) => {
    return edgesFilterValues[edge.relation];
};

nodesView = new vis.DataView(orignodes, {
    filter: nodesFilter
});

/*
nodesView2 = new vis.DataView(nodesView, {
    filter: nodesFilter2
});
*/

edgesView = new vis.DataView(origedges, {
    filter: edgesFilter
});

nodeFilterSelector.addEventListener("change", (e) => {
    // set new value to filter variable
    nodeFilterValue = e.target.value;
    /*
    refresh DataView,
    so that its filter function is re-calculated with the new variable
    */
    //nodesView.refresh();
});

edgeFilters.forEach((filter) =>
    filter.addEventListener("change", (e) => {
        const {
            value,
            checked
        } = e.target;
        edgesFilterValues[value] = checked;
        //edgesView.refresh();
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
    var nodeids = nodesView.getIds();
    nodecount = [];
    for (var i = 0; i < nodeids.length; i++) {
        var templabel = findVariableLabelFromId(nodeids[i]);
        if(templabel=="") {
          templabel = nodeLabelFromIdh(nodeids[i]);
        }
        nodecount[i] = {
            id: nodeids[i],
            count: (network.getConnectedNodes(nodeids[i], "from").length +
                network.getConnectedNodes(nodeids[i], "to").length),
            label: templabel,
        };
    }

    for (var i = 0; i < combvardet.length; i++) {
        combvardet[i].count = (network.getConnectedNodes(combvardet[i].id, "from").length +
            network.getConnectedNodes(combvardet[i].id, "to").length);
    }

}


getVariableHierarchy = function() {
    if (currentenv == "offline") {
        var varpromise = new Promise((resolve, reject) => {
            var dummyvars = [{
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
                    "Variablename": "rainfall",
                    Parent: "weather"
                },
                {
                    "Variablename": "weather",
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
                    "Variablename": "anxiety",
                    Parent: ""
                },
                {
                    "Variablename": "performance anxiety",
                    Parent: "anxiety"
                },
                {
                    "Variablename": "social anxiety",
                    Parent: "anxiety"
                },
                {
                    "Variablename": "performance",
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
            if (typeof items[i].Parent === "undefined") {
                badparent = true;
            } else {
                if (items[i].Parent == "") {
                    badparent = true;
                }
            }

            if (!badparent) {
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
                    if (items[j].Parent == null) {
                        allparents[i] = "";
                    } else {
                        allparents[i] = items[j].Parent;
                    }

                }
                if (items[j].Parent == allvars[i]) {
                    if (items[j].Variablename == null) {

                    } else {
                        allchildren[i].push(items[j].Variablename);
                    }
                }
            }
        }

        for (var i = 0; i < allvars.length; i++) {
            nodesh[i] = {
                id: (i),
                label: allvars[i],
                parent: allparents[i],
            };
        }
        items = keep.map(i => items[i]);

        for (var i = 0; i < items.length; i++) {
            edgesh[i] = {
                from: allvars.indexOf(items[i].Parent),
                to: allvars.indexOf(items[i].Variablename)
            };
        }


        getEdges();


    });
}



getNextLevel = function(orid) {
    let nextlevel = [];
    for (var i = 0; i < edgesh.length; i++) {
        if (edgesh[i].from == orid) {
            nextlevel.push(edgesh[i].to);
        }
    }
    return nextlevel;
}

createNextLevel = function(currentorig) {
    let toplevel = document.createElement("li");
    toplevel.id = "node" + currentorig;
    let nextlev = getNextLevel(currentorig);
    if (nextlev.length > 0) {
        let topspan = document.createElement("span");
        topspan.className = "caret";
        topspan.innerText = nodesh[currentorig].label;
        topspan.id = "node" + currentorig;
        toplevel.appendChild(topspan);
        let toplevellist = document.createElement("ul");
        toplevellist.className = "nested";
        toplevellist.id = "nodelist" + currentorig;

        for (var i = 0; i < nextlev.length; i++) {
            if (toplevellist.nextSibling) {
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
        toplevel.innerText = nodesh[currentorig].label;
    }
    return (toplevel);
}

foldNode = function() {
    var toggler = document.getElementsByClassName("caret");
    for (i = 0; i < toggler.length; i++) {
        if (toggler[i].innerHTML == document.getElementById("parentlist").currentparent) {
            if (toggler[i].className != "caret caret-down") {
                toggler[i].classList.toggle("caret-down");
            }
            if (toggler[i].parentElement.querySelector(".nested").classList[1] != 'active') {
                toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
            }
        }
    }
    showCurrentNetworkState();
    hideVariableHeaders();
}


unfoldNode = function() {
    var toggler = document.getElementsByClassName("caret");

    for (i = 0; i < toggler.length; i++) {
        if (toggler[i].innerHTML == document.getElementById("varname").innerHTML) {
            if (toggler[i].className == "caret caret-down") {
                toggler[i].classList.toggle("caret-down");
            }
            if (toggler[i].parentElement.querySelector(".nested").classList[1] == 'active') {
                toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
            }
        }
    }
    showCurrentNetworkState();
    hideVariableHeaders();
}

refoldNode = function() {
    var toggler = document.getElementsByClassName("caret");

    for (i = 0; i < toggler.length; i++) {
        if (toggler[i].innerHTML == document.getElementById("varname").innerHTML) {
            if (toggler[i].className != "caret caret-down") {
                toggler[i].classList.toggle("caret-down");
            }
            if (toggler[i].parentElement.querySelector(".nested").classList[1] != 'active') {
                toggler[i].parentElement.querySelector(".nested").classList.toggle("active");
            }
        }
    }
    showCurrentNetworkState();
    hideVariableHeaders();
}

createListHierarchy = function() {
    var originnodes = [];

    for (var i = 0; i < nodesh.length; i++) {
        if (reachableByNodes(i, edgesh).length == 0) {
            if (reachableNodesGeneral(i, edgesh).length > 0) {
                originnodes.push(i);
            }
        }
    }
    originnodes.sort(function(a, b) {
        let alabel = nodeLabelFromIdh(a);
        let blabel = nodeLabelFromIdh(b);
        return alabel.localeCompare(blabel);
    });
    for (var i = 0; i < originnodes.length; i++) {
        nestedvars.appendChild(createNextLevel(originnodes[i]));
    }
    var toggler = document.getElementsByClassName("caret");
    var i;
    for (i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function() {
            let tempid = Number(this.id.replace("node", ""));
            //console.log(tempid);
            this.parentElement.querySelector(".nested").classList.toggle("active");
            this.classList.toggle("caret-down");

            showCurrentNetworkState();
        });
    }
    foldTopLevels();
}
nodeLabelFromIdh = function(id) {
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].id == id) {
            return (nodesh[i].label);
        }
    }
}

makeNodeOrange = function(id) {
  if(network.body.nodes[id]!=null) {
  network.body.nodes[id].options.color.background = "#fcb103";
  network.body.nodes[id].options.color.highlight.background = "#ffe224";
  network.body.nodes[id].options.color.border = "#a17902";
  network.body.nodes[id].options.color.highlight.border = "#a17902";
  //network.redraw();  
  }
  
}

makeNodeRed = function(id) {
  network.body.nodes[id].options.color.background = "#e75a2b";
  network.body.nodes[id].options.color.highlight.background = "#fa6464";
  network.body.nodes[id].options.color.border = "#a42a02";
  network.body.nodes[id].options.color.highlight.border = "#a42a02";
  //network.body.nodes[id].options.font.color = "#ffffff";
  //network.body.nodes[id].options.font.bold.color = "#ffffff";
  //network.body.emitter.emit('_dataChanged');
  //network.redraw();
}

makeNodeBoring = function(id) {
  try{
    //delete(network.body.nodes[id].options.borderWidth);  
  } catch(e) {
    
  }
  try{
    delete(network.body.nodes[id].options.color.background);  
  } catch(e) {
    
  }
  try{
    delete(network.body.nodes[id].options.color.border);  
  } catch(e) {
    
  }
  try{
    delete(network.body.nodes[id].options.color.highlight.background);  
  } catch(e) {
    
  }
  try{
    delete(network.body.nodes[id].options.color.highlight.border);  
  } catch(e) {
    
  }
  //network.redraw();
}


makeEdgeTwoway = function(edge) {
    //console.log("make edge twoway activated");
    if(network.body.edges[edge].options.arrows.from.enabled!=null) {
      if(!network.body.edges[edge].options.arrows.from.enabled) {
        network.updateEdge(edge, {
          arrows: {
              from: {
                  enabled: true
              }
          },
          color: "purple",
          relation: "twoway"
      })
      } else {
        //console.log("avoided");
      }        
    } else {
      //console.log("avoided")
    }
}

updateAllClusterEdges = function() {
    var clusternodestemp = [];

    var clusternodestemp = getAllClusters(network);

    for (var i = 0; i < clusternodestemp.length; i++) {
        try {
            var basenodes = network.getNodesInCluster(clusternodestemp[i].id);
        } catch (e) {
            let sink = e;
        }
        try {
            var clusteredges = network.getConnectedEdges(clusternodestemp[i].id);
        } catch (e) {
            let sink = e;
        }


        for (var j = 0; j < clusteredges.length; j++) {
            try {
                var baseedgeids = network.getBaseEdges(clusteredges[j]);
                var baseedges = origedges.get(baseedgeids);
                var anyto = false;
                var anyfrom = false;
                for (var k = 0; k < baseedges.length; k++) {
                    if (basenodes.includes(baseedges[k].from)) {
                        anyfrom = true;
                    }
                    if (basenodes.includes(baseedges[k].to)) {
                        anyto = true;
                    }
                }

                if (anyfrom & anyto) {
                    makeEdgeTwoway(clusteredges[j]);
                }

            } catch (e) {

            }
        }
    }
}

updateFoldedList = function(component) {
    notstarted = true;
    nodesView.refresh();
    var foldeddown = false;
    if (component.children != null) {
        if (component.children[0] != null) {
            if (component.children[0].classList != null) {
                if (component.children[0].classList.value == 'caret caret-down') {
                    foldeddown = true;
                }
            }
        }
    }
    if (foldeddown) {
        var run = true;
        for (var j = 0; j < nodesh.length & run; j++) {
            if (nodesh[j].label == component.children[0].innerText) {
                foldednodes.push(nodesh[j]);
                run = false;
            }
        }
    } else {
        if (component.children.length == 0) {
            return null;
        }
        
        if (component.children[1].children.length > 0) {
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



findVariableInOriginalNodes = function(label) {
    var allnodestemp = orignodes.get();
    for (var i = 0; i < allnodestemp.length; i++) {
        if (allnodestemp[i].label == label) {
            return (allnodestemp[i])
        }
    }
    return (-1)
}
var nofilter = false;


toggleNoFilterMode = function() {
    nofilter = !nofilter;
    nodesView.refresh();
    edgesView.refresh();
}


showFilterBoxes = function() {
    document.getElementById("varselector").hidden = false;
}


function openTab(tabbutton, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    //evt.currentTarget.className += " active";
    document.getElementById(tabbutton).className += " active";

}


findVariableIdFromLabel = function(label) {
    for (var i = 0; i < combvardet.length; i++) {
        if (combvardet[i].label == label) {
            return (combvardet[i].id);
        }
    }
    return (-1)
}
findVariableLabelFromId = function(id) {
    for (var i = 0; i < combvardet.length; i++) {
        if (combvardet[i].id == id) {
            return (combvardet[i].label);
        }
    }
    return ("")
}


isVariableClustered = function(id) {
    var allclusters = getAllClusters(network);
    for (var i = 0; i < allclusters.length; i++) {
        if (network.getNodesInCluster(allclusters[i].id).includes(id)) {
            return true;
        }
    }
    return false;
}
formatArticle = function(dat, showurl = true) {
    var authors = [];
    for (var i = 0; i < dat.author.length; i++) {
        authors[i] = dat.author[i].given + " " + dat.author[i].family;
    }
    var authorlist = authors.join(", ");
    var title = dat.title[0];
    var journal = dat["container-title"][0];
    if (journal == null) {
        journal = "";
    }
    var year = dat.published["date-parts"][0][0];
    if(showurl) {
      let doiurl = dat.URL;
      var combtitle = "• " + authorlist + " (" + year + ") \"" +
        title + "\"" + " " + journal + ": " + "<a href=\"" + doiurl +
        "\" target=\"_blank\">" + doiurl + "</a>\n";  
    } else {
      var combtitle = "• " + authorlist + " (" + year + ") \"" +
        title + "\"" + " " + journal + ": ";  
    }
    
    //console.log(combtitle);
    return combtitle
}


/*
var citetable = [];
pubtext.edgeid = id;
var edgenodes = network.getConnectedNodes(pubtext.edgeid);
var xvar = findVariableLabelFromId(edgenodes[0]);
var yvar = findVariableLabelFromId(edgenodes[1]);
openTab("buttonviewertab", 'viewertab');
hideVariableHeaders();
document.getElementById("studytitle").innerText = "Studies";
document.getElementById("claimstudy").innerText = "";
clearStudyText();
let studytitle = xvar + " 🡒 " + yvar;
*/


createEdgeTable = function() {
  let edgetable = document.getElementById("edgetable");
  try{
  edgetable.deleteTHead();
  while(edgetable.rows.length>0) {
    edgetable.deleteRow(0)
  }
  } catch(e) {
    
  }
  
  var citetable = [];  
  var visibleedges = network.body.edgeIndices;
  var edgesall = Object.entries(network.body.edges);

  for (var i = 0; i < visibleedges.length; i++) {
    if(visibleedges[i].includes("cluster")) {
     var betemp = network.getBaseEdges(visibleedges[i]);
     for (var j = 0; j < betemp.length; j++) {
       var doiset = getDOIMulti(betemp[j]).split(";");
       for (var k = 0; k < doiset.length; k++) {
         doiset[k] = doiset[k].toLowerCase();
       }
       var relationship = network.body.edges[visibleedges[i]].from.options.label + " 🡒 " + network.body.edges[visibleedges[i]].to.options.label;
       var col = network.body.edges[betemp[j]].options.color.color;
       var finding;
            if(col == "green") {
              finding= "positive"
            }
            if(col == "red") {
              finding= "negative"
            }
            if(col == "gray") {
              finding= "zero"
            }
            if(col == "purple") {
              finding= "mixed"
            }
       citetable.push({relationship: relationship, 
                    x: network.body.edges[betemp[j]].from.options.label, 
                    y: network.body.edges[betemp[j]].to.options.label,
                    finding: finding,
                    citation: doiset
       });
     }
    }
  }
  let edgetabledata = Object.keys(citetable[0]);
  console.log(citetable)
  generateTable(edgetable, citetable);
  generateTableHead(edgetable, edgetabledata);
  firstedgetable = false;
}


function generateTableHead(table, data) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of data) {
    let th = document.createElement("th");
    
    let text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }
}

function generateTable(table, data) {
  for (let element of data) {
    let row = table.insertRow();
    for (key in element) {
      let cell = row.insertCell();
      if(key=="citation") {
        var celldiv = document.createElement('div');
        var count = 0;
        for (var j = 0; j < citations.length; j++) {
            if(element[key].includes(citations[j].DOI.toLowerCase())) {
              if(count>0) {
                let lbreak = document.createElement('br');
                celldiv.appendChild(lbreak);
              }
              var citetext = document.createTextNode(formatArticle(citations[j], false));
              celldiv.appendChild(citetext);
              var a = document.createElement('a');
              var linktext = document.createTextNode(citations[j].URL);

              a.appendChild(linktext);
              a.href = citations[j].URL;      
              celldiv.appendChild(a);
              count = count + 1;
              
          }
        }
        cell.appendChild(celldiv);
      } else {
        
        let text = document.createTextNode(element[key]);
        cell.appendChild(text); 
      }
    }
  }
}

