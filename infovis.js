import * as d3 from "d3"
import embed from 'vega-embed';
import { legendColor } from 'd3-svg-legend'
import colorbrewer from 'colorbrewer'
var infovis = {};

const renderVegaLite = function(wid_waypoint, id, visdata, events){
  try {
    return embed(`#${id}`, visdata, {
      actions: false,
      theme: 'dark'
    })
    .then(result => {
      result.view.addEventListener('click', function(event, item) {
        events.clickHandler(item.datum)
      });
    }).catch(console.warn);
  }
   catch (error) {
    throw error;
  }
}

infovis.renderMatrix = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderBarChart = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderScatterplot = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderCanvasScatterplot = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderOther = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderMaskAndPan = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderChanAndMaskandPanHandler = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderMultipleMasksHandler = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderMultipleMasksAndPan = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

infovis.renderMultipleMasksPanChannel = function(wid_waypoint, id, visdata, events) {
  return renderVegaLite(wid_waypoint, id, visdata, events);
}

export default infovis;
