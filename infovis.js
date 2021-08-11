import * as d3 from "d3"
import embed from 'vega-embed';
import { legendColor } from 'd3-svg-legend'
import colorbrewer from 'colorbrewer'
var infovis = {};

const renderVegaLite = function(wid_waypoint, id, visdata, events, eventHandler){
  try {
    embed(`#${id}`, visdata);
    return Promise.resolve();
  }
   catch (error) {
    throw error;
  }
}

infovis.renderMatrix = function(wid_waypoint, id, visdata, events, eventHandler) {
  return renderVegaLite(wid_waypoint, id, visdata, events, eventHandler);
}

infovis.renderBarChart = function(wid_waypoint, id, visdata, events, eventHandler) {
  return renderVegaLite(wid_waypoint, id, visdata, events, eventHandler);
}

infovis.renderScatterplot = function(wid_waypoint, id, visdata, events, eventHandler) {
  return renderVegaLite(wid_waypoint, id, visdata, events, eventHandler);
}

infovis.renderCanvasScatterplot = function(wid_waypoint, id, visdata, events, eventHandler) {
  return renderVegaLite(wid_waypoint, id, visdata, events, eventHandler);
}

export default infovis;
