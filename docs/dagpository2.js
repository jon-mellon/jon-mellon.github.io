
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
    
    /*
    if(!citationPresent(doi)) {
    fetch("https://api.crossref.org/works/" + doi)
        .then((response) => {
            console.log("crossref API Call");
            if (response.ok) {
                let jsonout = response.json();
                return jsonout;
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
            }
        })
        .then(data => {
            console.log(data.message);
            pubtext.innerHTML = pubtext.innerHTML + "<br>" + formatArticle(data.message);
            if(!citationPresent(doi)) {
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
    */
}

getDOIFromCrossRef = function(doi) {
   fetch("https://api.crossref.org/works/" + doi)
        .then((response) => {
            //console.log("crossref API Call");
            if (response.ok) {
                let jsonout = response.json();
                return jsonout;
            } else {
                throw new Error("NETWORK RESPONSE ERROR");
            }
        })
        .then(data => {
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
/*
async function populateCitations(dois) {
    pubtext.value = "";
    for (var i = 0; i < dois.length; i++) {
        try {
            let crtemp = crossRefCall(dois[i]);
            pubtext.value = pubtext.value + "\n" + crtemp;
        } catch (error) {

        }
    }
}
*/

//// main DAG ////
attemptDAGButton = function() {
    const dvselector = document.getElementById('selectDV');
    const ivselector = document.getElementById('selectIV');
    if (dvselector.value != "Choose a dependent variable" &
        ivselector.value != "Choose an independent variable") {
        const dagbutton = document.getElementById('createdagbutton');
        dagbutton.disabled = false;
    }
}

dvSelected = function() {
    const dvselector = document.getElementById('selectDV');

    canreachdv = reachableByNodes(allvars.indexOf(dvselector.value), edgeset)
    dvcanreach = reachableNodesGeneral(allvars.indexOf(dvselector.value), edgeset)
    updateNodeStatus();
    attemptDAGButton();
}

ivSelected = function() {
    const ivselector = document.getElementById('selectIV');

    canreachiv = reachableByNodes(allvars.indexOf(ivselector.value), edgeset)
    ivcanreach = reachableNodesGeneral(allvars.indexOf(ivselector.value), edgeset)
    updateNodeStatus();
    attemptDAGButton();
}

getNodesStatus = function(cnode, iv, dv) {
    if (iv == cnode) {
        return ("dependent variable");
    }
    if (dv == cnode) {
        return ("independent variable");
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
        if (dvr) {
            return ("do not adjust");
        }
        return ("irrelevant");
    }
}

updateNodeStatus = function() {
    const dvselector = document.getElementById('selectDV');
    const ivselector = document.getElementById('selectIV');

    let dv = allvars.indexOf(dvselector.value);
    let iv = allvars.indexOf(ivselector.value);
    for (var i = 0; i < allvars.length; i++) {
        nodestatus[i] = getNodesStatus(i, iv = iv, dv = dv);
    }
    var confounders = [];
    for (var i = 0; i < allvars.length; i++) {
        if (nodestatus[i] == "confounder") {
            confounders.push(i);
        }
    }
    for (var i = 0; i < confounders.length; i++) {
        let cfreach = reachableNodesGeneral(confounders[i], edgeset);
        for (var j = 0; j < cfreach.length; j++) {
            if (canreachdv.includes(cfreach[j]) | canreachiv.includes(cfreach[j])) {
                nodestatus[cfreach[j]] = "confounder pathway";
            }
        }
    }
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
    const spreadsheetId = "11hfXFfdpMyDEeMSy3xeO3rsbI7a6UdcaJfJpZZlBJ34"
    const sheetId = 0;
    const sheetName = "causalclaims";
    const sheetInfo = {
        sheetId,
        sheetName
    }
    const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo)
    //setLoading()
    
    parser.parse().then((items) => {
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

        var dvselect = document.getElementById("selectDV");
        var ivselect = document.getElementById("selectIV");

        for (var i = 0; i < allvars.length; i++) {
            var opt = allvars[i];
            var el = document.createElement("option");
            var el2 = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            el2.textContent = opt;
            el2.value = opt;
            dvselect.appendChild(el);
            ivselect.appendChild(el2);
        }



        //var nodeset = [];
        /*
        for (var i = 0; i < uniquenodes.length; i++) {
            nodeset[i] = {
                id: (i),
                label: uniquenodes[i],
                attribute: "test"
            };
        }
        */


        testEdgeChoice = function(values,
            id,
            selected,
            hovering) {
            if (selected) {
                values.strokeWidth = 3;
                values.width = 3;
                
                
                if (pubtext.edgeid != id) {
                  pubtext.edgeid = id;
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
    })
}

createNetwork = function() {
    const nodeFilterSelector = document.getElementById("nodeFilterSelect");
    const edgeFilters = document.getElementsByName("edgesFilter");
    // setting nodes to be the ones from the hierarchy
    nodeset = nodesh;
    nodes = new vis.DataSet(nodeset);
    edges = new vis.DataSet(edgeset);
    const dvselector = document.getElementById('selectDV');
    const ivselector = document.getElementById('selectIV');
    const resetit = document.getElementById('resetbutton');
    const dagbutton = document.getElementById('createdagbutton');

    dagbutton.disabled = true;
    dvselector.disabled = true;
    ivselector.disabled = true;
    resetit.disabled = false;

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
        // temporary while testing:
        if(network!=null) {
        var nodecount = (network.getConnectedNodes(node.id, "from").length + 
              network.getConnectedNodes(node.id, "to").length);
        if(nodecount==0) {
              return false;
            } else {
              return true;
            }  
        } else {
          return true;
        }
        
        
        //return true;
        
        if (nodestatus[node.id] != "irrelevant") {
            return true;
        } else {
            return false;
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
    nodesView.refresh();
}


//// hierarchy ////

hideChildren = function(nodeid) {
    if (!foldednodes.includes(nodeid)) {
        foldednodes.push(nodeid);
    }
    var parentlabel;
    let hidethese = reachableNodesGeneral(nodeid, edgesh);
    if (hidethese.length > 0) {
        //var clickednode = nodesViewh.get(nodeid);
        //clickednode.color = "#09e472";
        //nodesh2.update(clickednode);
    }
    for (var i = 0; i < nodesh.length; i++) {
        if (nodesh[i].id == nodeid) {
            nodesh[i].color = "#09e472";
            parentlabel = nodesh[i].label
        }
        if (hidethese.includes(i)) {
            hidden.push(i);
        }
    }
    hidethese.push(nodeid);
    clusterNodes(nodeids = hidethese, 
      label = parentlabel, origid = nodeid);
    //nodesViewh.refresh();
}

showChildren = function(nodeid) {
    //var clickednode = nodesViewh.get(nodeid);
    //clickednode.color = null;
    //nodesh2.update(clickednode);
    
    let showthese = reachableNodesGeneral(nodeid, edgesh);
    if (foldednodes.indexOf(nodeid) != -1) {
        foldednodes.splice(foldednodes.indexOf(nodeid));
    }

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
    //nodesViewh.refresh();
}

getVariableHierarchy = function() {
    const spreadsheetId = "1JdIwj_x64L6rpEK48acjnctYfrzFIS5HBkb4s27S7L8";
    const sheetId = 0;
    const sheetName = "variables";
    const sheetInfo = {
        sheetId,
        sheetName
    }
    const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo)
    //setLoading()

    parser.parse().then((items) => {
        var keep = [];
        for (var i = 0; i < items.length; i++) {
            if (!allvars.includes(items[i].variable)) {
              allvars.push(items[i].variable);
            }
            
            //nodesh[i] = items[i].variable;
            if (typeof items[i].parent === "undefined") {

            } else {
              if (!allvars.includes(items[i].parent)) {
                allvars.push(items[i].parent);
              }
              keep.push(i);
            }
        }
        
        for (var i = 0; i < allvars.length; i++) {
          nodesh[i] = {id: (i), label: allvars[i]};
        }
        items = keep.map(i => items[i]);
        
        for (var i = 0; i < items.length; i++) {
          edgesh[i]=  {from: allvars.indexOf(items[i].parent), to: allvars.indexOf(items[i].variable)};
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
        //nodesView.refresh();
      });
}

draw = function () {
    if (networkh !== null) {
        networkh.destroy();
        networkh = null;
    }
  
    // create the network
    var container = document.getElementById("mynetworkh");

    var options = {
        layout: {
            hierarchical: {
                sortMethod: "directed",
                shakeTowards: "roots",
            },
        },
        edges: {
            smooth: true,
            arrows: {
                to: true
            },
        },
    };



    const nodesFilter = (node) => {
        //node.id
        if (hidden.includes(node.id)) {
            return false;
        } else {
            return true;
        }
    };


    const edgesFilter = (edge) => {
        //node.id
        return true;
    };


    nodesshown = [];
    for (var i = 0; i < nodesh.length; i++) {
        if (!hidden.includes(nodesh[i].id)) {
            nodesshown.push(nodesh[i]);
        }
    }
    nodesh2 = new vis.DataSet(nodesshown);
    edgesh2 = new vis.DataSet(edgesh);

    nodesViewh = new vis.DataView(nodesh2, {
        filter: nodesFilter
    });
    const edgesViewh = new vis.DataView(edgesh2, {
        filter: edgesFilter
    });
    
    var data = {
        nodes: nodesViewh,
        edges: edgesViewh,
    };
   
    
    networkh = new vis.Network(container, data, options);


    networkh.on('click', function(properties) {
        var ids = properties.nodes;
        if (foldednodes.includes(ids[0])) {
            showChildren(ids[0]);
        } else {
            hideChildren(ids[0]);
        }
        
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
    
    clusterNodes = function(nodeids, label, origid) {
      let clusterid = "cluster"+(clusterednodes.length+1); 
      network.cluster({
      joinCondition(nodeOptions) {
        if(nodeids.includes(nodeOptions.id)) {
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
      }});
      
      clusterednodes.push({id: clusterid,
        origid: origid,
        label: label});
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
  nestedvars = document.getElementById('ultest');
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
      var flipswitch = true;

      if (foldednodes.includes(tempid)) {
        try{
          showChildren(tempid);  
        } catch(error) {
          flipswitch = false;
        }
        
      } else {
        try{
          hideChildren(tempid);  
        } catch(error) {
          flipswitch = false;
        }
        if(flipswitch) {
  
        }
      }
      
    });
  }
  
  
}


// figuring out how to make clustered edges work consistently:
// this 

// this code successfully updates the color but the DOI doesn't seem to get recorded
//network.clustering.updateEdge(clusterexample, {dois: "10.1111/0022-3816.00035", color : "pink"})

/*
for (var i = 0; i < network.clustering.body.edgeIndices.length; i++) {
 
}
*/