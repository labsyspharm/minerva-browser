const strip = function(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

// Get the cell-type and protein context links as well as aliased names
export const get_links_alias = function(data) {

    data = data.map(function(d) {
      if (d["﻿String"]) {
        d.String = d["﻿String"];
      }
      return d;
    })

    // Create map of aliases for cell-type and protein names
    const alias_map = new Map();
    data.filter(d => d.Alias).forEach(function(d) {
      d.Alias.split(',').forEach(function(a) {
        alias_map.set(strip(a), strip(d.String));
      });
    });

    // Create map of context links for cell-type and protein names
    const links_map = new Map();
    data.filter(d => d.Link).forEach(function(d) {
      if (d.Alias) {
        const all_alias = d.Alias.split(',').map(strip);

        const dup_alias = all_alias.reduce((arr, a) => {
          const escaped_a = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match_a = RegExp('^'+escaped_a+'$', 'gi');
          if (strip(d.String).match(match_a)) {
            return arr.concat([a]);
          }
          for (var i in all_alias) {
            var s = all_alias[i];
            if (s.match(match_a) && s!=a && !arr.includes(s)) {
              return arr.concat([a]);
            }
          }
          return arr;
        }, []);
        
        const true_alias = all_alias.filter(a => {
          return !dup_alias.includes(a)
        })
        true_alias.forEach(function(a) {
          links_map.set(a, strip(d.Link));
        }); 
      }
      links_map.set(strip(d.String), strip(d.Link));
    });

    return [links_map, alias_map];
}
