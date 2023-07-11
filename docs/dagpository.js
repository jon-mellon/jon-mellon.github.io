showChildren = function(nodeid) { 
        var clickednode = nodesViewh.get(nodeid);
        clickednode.color = null;
        nodesh2.update(clickednode);
        
        let showthese = reachableNodesGeneral(nodeid, edgesh);
        if(foldednodes.indexOf(nodeid)!=-1) {
          foldednodes.splice(foldednodes.indexOf(nodeid));  
        }
        
        for (var i = 0; i < nodesh.length; i++) {
         if(showthese.includes(i)) {
           //hidden.push(i);
           hidden.splice(hidden.indexOf(i));
         } 
        }
        for (var i = 0; i < foldednodes.length; i++) {
          hideChildren(foldednodes[i]);
        }
        nodesViewh.refresh();
      }
       clearStudyText = function() {
    pubtext.innerHTML = ""
  }
populateCiteFromDOI = function(doi) {
    fetch("https://api.crossref.org/works/" + doi)
  .then((response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error("NETWORK RESPONSE ERROR");
    }
  })
  .then(data => {
    console.log(data.message);
    pubtext.innerHTML = pubtext.innerHTML + "<br>" + formatArticle(data.message);
  })
    .catch((error) => console.error("FETCH ERROR:", error));
}
populateDOIList= function(dois) {
    clearStudyText();
    for (var i = 0; i < dois.length; i++) {
      populateCiteFromDOI(dois[i]);
    }    
}
  
cleanDOI = function(doi) {
    doi = doi.replace("https://doi.org/", "");
    doi = doi.replace("http://doi.org/", "");
    doi = doi.replace("doi.org/", "");
    doi = doi.replace("www.doi.org/", "");
    return(doi)
  }
    
formatArticle = function(dat) {
    
    var authors = [];
    for (var i = 0; i < dat.author.length; i++) {
      authors[i] = dat.author[i].given + " " + dat.author[i].family;
    }
    var authorlist = authors.join(", ");
    var title = dat.title[0];
    var journal = dat["container-title"][0];
    if(journal.length==0) {
      journal = "";
    }
    var year= dat.published["date-parts"][0][0];
    let doiurl = dat.URL;
    var combtitle = "• " + authorlist  +" (" + year+ ") \"" +
    title + "\"" + " " + journal + ": " + "<a href=\"" + doiurl +
    "\" target=\"_blank\">" + doiurl + "</a>\n";
    console.log(combtitle);
    return combtitle
  }
  
   async function populateCitations(dois) {
      pubtext.value = "";
      for (var i = 0; i < dois.length; i++) {
        try {
          let crtemp =  crossRefCall(dois[i]);
          pubtext.value= pubtext.value+ "\n" + crtemp;
        }  catch(error) {
          
        }
      }
    }
          
    attemptDAGButton = function() {
      const dvselector = document.getElementById('selectDV');
      const ivselector = document.getElementById('selectIV');
      if(dvselector.value!="Choose a dependent variable" & 
      ivselector.value!="Choose an independent variable") {
        const dagbutton = document.getElementById('createdagbutton');
        dagbutton.disabled = false;
      }
    }
    
    dvSelected = function() {
      const dvselector = document.getElementById('selectDV');
      
      canreachdv = reachableByNodes(uniquenodes.indexOf(dvselector.value))
      dvcanreach = reachableNodesGeneral(uniquenodes.indexOf(dvselector.value),edgeset)
      updateNodeStatus();
      attemptDAGButton();
    }
        
    ivSelected = function() {
      const ivselector = document.getElementById('selectIV');
      
      canreachiv = reachableByNodes(uniquenodes.indexOf(ivselector.value))
      ivcanreach = reachableNodesGeneral(uniquenodes.indexOf(ivselector.value), edgeset)
      updateNodeStatus();
      attemptDAGButton();
    }
    

getNodesStatus = function(cnode, iv, dv) {
          if(iv==cnode) {
            return ("dependent variable");
          }
          if(dv==cnode) {
            return("independent variable");
          }
          let riv =  canreachiv.includes(cnode);
          let rdv =  canreachdv.includes(cnode);
          let ivr =  ivcanreach.includes(cnode);
          let dvr =  dvcanreach.includes(cnode);
          if( (riv & ivr) | (rdv & dvr) | (dvr & riv) ) {
            return("loop");  
          } else {
            if(riv & rdv) {
              return("confounder");    
            }
            if(ivr & rdv) {
              return("mediator");    
            }
            if(dvr) {
              return("do not adjust");    
            }
            return("irrelevant");
          }
        }
updateNodeStatus = function() {
  const dvselector = document.getElementById('selectDV');
  const ivselector = document.getElementById('selectIV');

  let dv = uniquenodes.indexOf(dvselector.value);
  let iv = uniquenodes.indexOf(ivselector.value);
  for (var i = 0; i < uniquenodes.length; i++) {
    nodestatus[i] = getNodesStatus(i, iv = iv, dv = dv);
  }
      var confounders = [];
      for (var i = 0; i < uniquenodes.length; i++) {
        if(nodestatus[i]=="confounder") {
          confounders.push(i);
        }
      }
      for (var i = 0; i < confounders.length; i++) {
        let cfreach = reachableNodesGeneral(confounders[i], edgeset);
        for (var j = 0; j < cfreach.length; j++) {
          if(canreachdv.includes(cfreach[j]) | canreachiv.includes(cfreach[j])) {
            nodestatus[cfreach[j]] = "confounder pathway";
          }
        }
      }
    }
    
    
     const showResult = (string) => {
        resultElement.innerHTML = JSON.stringify(string, null, 2)
      }
      function onlyUnique(value, index, array) {
        return array.indexOf(value) === index;
      }
      
      
      hideChildren = function(nodeid) {
        if(!foldednodes.includes(nodeid)) {
          foldednodes.push(nodeid);  
        }
        
        let hidethese = reachableNodesGeneral(nodeid, edgesh);
        if(hidethese.length>0) {
          var clickednode = nodesViewh.get(nodeid);
          clickednode.color = "#09e472";
          nodesh2.update(clickednode);
        }
        for (var i = 0; i < nodesh.length; i++) {
         if(nodesh[i].id==nodeid) {
           nodesh[i].color = "#09e472";
         }
         if(hidethese.includes(i)) {
           hidden.push(i);
         }
        }
        nodesViewh.refresh();
      }
      
      
      reachableNodesGeneral = function(startnode, edgesetall) {
        var nodesreached = [];
        var nodestocheck = [startnode];
        var nodeschecked = [];
        var dist = 0;
        while(nodestocheck.length>0) {
          dist = dist+1;
          for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode   = nodestocheck[i];
            for (var j = 0; j < edgesetall.length; j++) {
              if(edgesetall[j].from==currentnode) {
                if(!nodesreached.includes(edgesetall[j].to)) {
                // adding new node to reached list
                nodesreached.push(edgesetall[j].to);
                  if(!nodeschecked.includes(edgesetall[j].to) & 
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
      
      
      /*
      reachableNodes = function(startnode) {
        var nodesreached = [];
        var nodestocheck = [startnode];
        var nodeschecked = [];
        var dist = 0;
        while(nodestocheck.length>0) {
          dist = dist+1;
          for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode   = nodestocheck[i];
            for (var j = 0; j < edgeset.length; j++) {
              if(edgeset[j].from==currentnode) {
                if(!nodesreached.includes(edgeset[j].to)) {
                // adding new node to reached list
                nodesreached.push(edgeset[j].to);
                  if(!nodeschecked.includes(edgeset[j].to) & 
                    !nodestocheck.includes(edgeset[j].to)) {
                    // adding new node to need to check list
                    nodestocheck.push(edgeset[j].to);
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
      */
      
      
      reachableByNodes = function(startnode) {
        var nodesreached = [];
        var nodestocheck = [startnode];
        var nodeschecked = [];
        var dist = 0;
        while(nodestocheck.length>0) {
          dist = dist+1;
          for (var i = 0; i < nodestocheck.length; i++) {
            var currentnode   = nodestocheck[i];
            for (var j = 0; j < edgeset.length; j++) {
              if(edgeset[j].to==currentnode) {
                if(!nodesreached.includes(edgeset[j].from)) {
                // adding new node to reached list
                nodesreached.push(edgeset[j].from);
                  if(!nodeschecked.includes(edgeset[j].from) & 
                    !nodestocheck.includes(edgeset[j].from)) {
                    // adding new node to need to check list
                    nodestocheck.push(edgeset[j].from);
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
        const spreadsheetId = "1N66GqAVQGcmV4PMQk6B2zDwvSZ3Oa6aF6FXwfKoVUU8"
        const sheetId = 0;
        const sheetName = "causalclaims";
        const sheetInfo = { sheetId, sheetName }
        const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo)
        //setLoading()
       
        parser.parse().then((items) => {
          // items should be [{ a :1, b :2, c :3 },{ a :4, b :5, c :6 },{ a :7, b :8, c :9 }]
          //showResult(items)
          console.table(items)
          // console.log("using this version");
          currentitems = items;
          var edgecombs = [];
          for (var i = 0; i < currentitems.length; i++) {
            try {
              currentitems[i].doi = cleanDOI(currentitems[i].doi);  
            } catch(error) {
              
            }
            
            allnodes.push(currentitems[i].x);
            allnodes.push(currentitems[i].y);
            currentitems[i].edgecomb = currentitems[i].x + "|" + currentitems[i].y;
            edgecombs[i] = currentitems[i].edgecomb;
          }
          
          var uniqueedgecombs = edgecombs.filter(onlyUnique);
          var uniqueitems = [];
          for (var i = 0; i < uniqueedgecombs.length; i++) {
            let firstmatch = edgecombs.indexOf(uniqueedgecombs[i]);
            uniqueitems[i] = currentitems[firstmatch];
            
            for (var j = (firstmatch+1); j <edgecombs.length; j++) { 
              if(uniqueedgecombs[i]==edgecombs[j]) {
                if(uniqueitems[i].finding!= currentitems[j].finding) {
                  uniqueitems[i].finding= "mixed";
                }
                uniqueitems[i].doi = uniqueitems[i].doi + ";" + currentitems[j].doi;
                uniqueitems[i].resultdocposition = uniqueitems[i].resultdocposition + ";" + currentitems[j].resultdocposition;
                
              }
            }
            if(uniqueitems[i].finding=="positive") {
              uniqueitems[i].color = "green";
            }
            if(uniqueitems[i].finding=="negative") {
              uniqueitems[i].color = "red";
            }
            if(uniqueitems[i].finding=="zero") {
              uniqueitems[i].color = "gray";
            }
            if(uniqueitems[i].finding=="mixed") {
              uniqueitems[i].color = "purple";
            }
          }

                    
          
          uniquenodes = allnodes.filter(onlyUnique);
          
          var dvselect = document.getElementById("selectDV");
          var ivselect = document.getElementById("selectIV");
          
          for(var i = 0; i < uniquenodes.length; i++) {
              var opt = uniquenodes[i];
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
          for (var i = 0; i < uniquenodes.length; i++) { 
              nodeset[i] = {id: (i), label: uniquenodes[i], attribute: "test"};
          }
          
          
          testEdgeChoice = function(values,
            id,
            selected,
            hovering) {
              if(selected) {
                values.strokeWidth = 3;
                values.width = 3;
                if(pubtext.edgeid != id) {
                  console.log("here2");
                  pubtext.edgeid = id;
                  var edgedata = edges.get();
                  for (var i = 0; i < edgedata.length; i++) { 
                    if(edgedata[i].id==id) {
                      populateDOIList(edgedata[i].dois.split(";"));
                    }
                  }  
              }
              }
            }
          
          // creating edges
          for (var i = 0; i < uniqueitems.length; i++) { 
            edgeset[i] = {
              from: uniquenodes.indexOf(uniqueitems[i].x), 
              to: uniquenodes.indexOf(uniqueitems[i].y),
              relation: uniqueitems[i].finding,
              arrows: "to",
              color: { color: uniqueitems[i].color },
              dois: uniqueitems[i].doi,
              resultdocposition: uniqueitems[i].resultdocposition,
              chosen: { label: false, edge: testEdgeChoice },
            };
          }
         
        })
      }  
      
      
      
   getVariableHierarchy = function() {
        const spreadsheetId = "1N66GqAVQGcmV4PMQk6B2zDwvSZ3Oa6aF6FXwfKoVUU8"
        const sheetId = 0;
        const sheetName = "variables";
        const sheetInfo = { sheetId, sheetName }
        const parser = new PublicGoogleSheetsParser(spreadsheetId, sheetInfo)
         //setLoading()
       
        parser.parse().then((items) => {
          var keep = [];
          var nodesh = [];
          for (var i = 0; i < items.length; i++) {
            nodesh[i] = items[i].variable;
            if(typeof items[i].parent==="undefined") {
              
            } else {
              keep.push(i);
            }
          }
          items = keep.map(i => items[i]);
          console.table(items);
          allitems = items;
        });
      }    
      
      
      createNetwork = function() {
        const nodeFilterSelector = document.getElementById("nodeFilterSelect");
        const edgeFilters = document.getElementsByName("edgesFilter");
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
        new vis.Network(container, data, options);
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
        if(nodestatus[node.id]!="irrelevant") {
          return true;
        } else {
          return false;
        }
        
        if (nodeFilterValue === "") {
          return true;
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

      const nodesView = new vis.DataView(nodes, { filter: nodesFilter });
      const edgesView = new vis.DataView(edges, { filter: edgesFilter });

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
          const { value, checked } = e.target;
          edgesFilterValues[value] = checked;
          edgesView.refresh();
        })
      );

      startNetwork({ nodes: nodesView, edges: edgesView });
      }
      
      
      function draw() {
        if (networkh !== null) {
          networkh.destroy();
          networkh = null;
        }

        nodesh = [
          { id: 0, label: "education" },
          { id: 1, label: "test scores" },
          { id: 2, label: "SAT" },
          { id: 3, label: "English SAT" },
          { id: 4, label: "Math SAT" },
          { id: 5, label: "5" },
          { id: 6, label: "graduated university" },
          { id: 7, label: "GRE" },
          { id: 8, label: "8" },
          { id: 9, label: "9" },
          { id: 10, label: "NAEP Scores" },
          { id: 11, label: "graduated high school" },
          { id: 12, label: "LSAT" },
          { id: 13, label: "years of education" },
          { id: 14, label: "14" },
          { id: 15, label: "15" },
          { id: 16, label: "16" },
          { id: 17, label: "17" },
          { id: 18, label: "18" },
        ];
      
        
        
        edgesh = [
          { from: 0, to: 1 },
          { from: 0, to: 6 },
          { from: 0, to: 13 },
          { from: 0, to: 11 },
          { from: 1, to: 2 },
          { from: 2, to: 3 },
          { from: 2, to: 4 },
          { from: 3, to: 5 },
          { from: 1, to: 10 },
          { from: 1, to: 7 },
          { from: 2, to: 8 },
          { from: 2, to: 9 },
          { from: 3, to: 14 },
          { from: 1, to: 12 },
          { from: 16, to: 15 },
          { from: 15, to: 17 },
          { from: 18, to: 17 },
        ];

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
            arrows: { to: true },
          },
        };
        
      
        
        const nodesFilter = (node) => {
          //node.id
          if(hidden.includes(node.id )) {
            return false;
          } else{
            return true;
          }
        };
      
        
        const edgesFilter = (edge) => {
          //node.id
          return true;
        };
      
        
        

        
        nodesshown = [];
        for (var i = 0; i < nodesh.length; i++) {
          if(!hidden.includes(nodesh[i].id)) {
            nodesshown.push(nodesh[i]);
          }
        }
        nodesh2 = new vis.DataSet(nodesshown);
        edgesh2 = new vis.DataSet(edgesh);
        
        nodesViewh = new vis.DataView(nodesh2, { filter: nodesFilter });
        const edgesViewh = new vis.DataView(edgesh2, { filter: edgesFilter });
        var data = {
          nodes: nodesViewh,
          edges: edgesViewh,
        };
        
        networkh = new vis.Network(container, data, options);
        
        /*
        networkh.cluster({
          joinCondition(nodeOptions) {
            if(nodeOptions.id==1 | nodeOptions.id==2) {
              return true;
            } else {
              return false;
            }
          },
        });
        */
        /*
        networkh.cluster({
          joinCondition(nodeOptions) {
            console.log(nodeOptions);
            return !!formData.get(`cluster-node-${nodeOptions.id}`);
          },
        });
        */
        
        networkh.on('click', function(properties) {
          var ids = properties.nodes;
          if(foldednodes.includes(ids[0])) {
            showChildren(ids[0]);
          } else {
            hideChildren(ids[0]);
          }
          console.log(ids);
        });
      }