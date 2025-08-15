const mapData = {}; // creates an empty global object to store map data
let scroller; //global
// load data, create svg, base map and tips
function setUpMap() {
  return Promise.all([
    d3.json("processed_data/WLAs.topojson"),
    d3.json("processed_data/tips_processed.geojson"),
  ]).then(([WLA_topo, tips]) => {
    const geo = topojson.feature(WLA_topo, WLA_topo.objects.wales_local_authorities);
    mapData.map = geo;
    mapData.tips = tips;
    //console.log(mapData.tips);

    //setting initial width and height
    const mapContainer = document.getElementById("map");
    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight;

    let svg = d3.select("#map")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const projection = d3.geoMercator().fitSize([width, height - 25], geo);
    const path = d3.geoPath().projection(projection);

    // g.boundaries
    svg.append("g").attr("class", "boundaries")
      .selectAll("path")
      .data(geo.features, d => d.properties.id || d.id || d.properties.name)
      .join("path")
      .attr("d", path)
      .attr("fill", "#eee")
      .attr("stroke", "#333");

    // g.tips
    svg.append("g").attr("class", "tips")
      .selectAll("circle")
      .data(tips.features.filter(d => d.geometry && d.geometry.coordinates))
      .join("circle")
      .attr("cx", d => projection(d.geometry.coordinates)[0])
      .attr("cy", d => projection(d.geometry.coordinates)[1])
      .attr("r", 3)
      .attr("fill", "#888")
      .attr("opacity", 0);

    // storing for easy access later
    mapData.projection = projection;
    mapData.path = path;
    mapData.svg = svg;
  }).catch(error => console.error("error, probably loading the data"));
}

// drawing map
function drawChart(stepIndex) {
  const {svg, projection, tips, map} = mapData;
  if (!svg) return;
  svg.selectAll("path").attr("fill", "#eee");   // reset styles

  switch (stepIndex) {
    case 0:
      // base map 
      svg.selectAll("g.tips").selectAll("circle")
        .transition()
        .duration(500)
        .attr("opacity", 0.2)
        .attr("fill", "blue"); // colour scheme??
      break;

    case 1:
      // highlight C and D tips --- maybe change colour scheme?
      svg.selectAll("circle")
        .transition()
        .duration(500)
        .attr("opacity", 0.6)
        .attr("fill", (d => {
          const category = d.properties.cat.toUpperCase();
          console.log(category);
          if (category == "C") {return "orange"}
          if (category == "D") {return "red"}
          else return "gray";
        }));
      break;

    case 2:
      // zoom? need to sort this step
      svg.selectAll("path")
        .transition()
        .duration(500)
      break;

    default:
      break;
  }
}

// init scrollama 
function setupScroll() {
  const isMobile = window.innerWidth < 400; //CHECK BEST DIMENSIONS 
  scroller = scrollama(); //assigning to global
  const steps = document.querySelectorAll('.step');
  //const graphicText = document.getElementById('graphic-text');

  function handleStepEnter(response) {
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === response.index);
    });
    drawChart(response.index); 
    console.log("entered step:", response.index);

  }

  if (!isMobile) {
    scroller
      .setup({
        step: ".step",
        offset: 0.75,
        debug: false,
      })
      .onStepEnter(handleStepEnter);
  }
  else {
  d3.selectAll(".step").each(function(d, i) {
    const container = d3.select(this).select(".map-container");
    drawChart(i, container);
  });

  }
}

//calling initial functions
// setUpMap().then(setupScroll);
setUpMap().then(() => {
  console.log(countCDAuthorities()); // now tips are loaded
  setupScroll();
});



//resize function 
window.addEventListener("resize", () => {
  if (!mapData.svg) return; // waiting for initial load
  
  const mapContainer = document.getElementById("map");
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  //projection
  mapData.projection.fitSize([width, height-25], mapData.map);
  //update SVG
  mapData.svg
  .attr("width", width)
  .attr("height", height);

  //update map boundaries 
  mapData.svg.selectAll("path")
  .attr("d", mapData.path);

  //tips 
  mapData.svg.selectAll("circle")
  .attr("cx", d => mapData.projection(d.geometry.coordinates)[0])
  .attr("cy", d => mapData.projection(d.geometry.coordinates)[1]);

  if (scroller) scroller.resize() //updates step measures
});

// function countAuthorities() {
//   const counts = {};
//   mapData.tips.features.forEach(la => {
//     if (la.properties.cat && la.properties.cat.toUpperCase() === "D") {
//       const auth = la.properties.authority_english;
//       counts[auth] = (counts[auth] || 0) + 1;
//     }
//   });
//   return counts;
// }

function countCDAuthorities() {
  const counts = {};
  mapData.tips.features.forEach(la => {
    const cat = la.properties.cat && la.properties.cat.toUpperCase();
    const auth = la.properties.authority_english;
    if ((cat === "C" || cat === "D") && auth) {
      counts[auth] = (counts[auth] || 0) + 1;
    }
  });
  return counts;
}





