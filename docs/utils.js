
onlyUnique = function(value, index, array) {
    return array.indexOf(value) === index;
}


function updateSelector(id, varset) {
   const selects = document.querySelectorAll('select');
   selects.forEach(select => {
      if (select.id == id) {
         const selectedOption = select.value;
         while (select.firstChild) select.removeChild(select.firstChild);
         select.append(new Option());

         varset.forEach(variable => {
            const option = new Option(variable, variable);
            if (variable === selectedOption) option.selected = true;
            select.append(option);
         });
      }
   });
}