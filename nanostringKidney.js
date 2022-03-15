const slideMedulla = require('./kidneyObjects/slideMedulla.json');
const slideCortex = require('./kidneyObjects/slideCortex.json');
import { addMask, addEListener } from './nanostringUtils';

// ROI coordinates
const allROIs = 
    {r001: {
        panCoord: {x: 0.4086, y: 0.4338},
        zoomRatio: 28.7133,
        ROIBox: [{overlay: {x: 0.4056, y: 0.429, width: 0.0085, height: 0.0077}}],
        maskName: ["Cortical glomerulus"]
    },
    r002: {
        panCoord: {x: 0.3698, y: 0.271},
        zoomRatio: 38.3376,
        ROIBox: [{overlay: {x: 0.3673, y: 0.2665, width: 0.008, height: 0.008}}],
        maskName: ["Cortical glomerulus"]
    },
    r003: {
        panCoord: {x: 0.3988, y: 0.362},
        zoomRatio: 26.8993,
        ROIBox: [{overlay: {x: 0.3942, y: 0.3567, width: 0.008, height: 0.0088}}],
        maskName: ["Cortical glomerulus"]
    },
    r004: {
        panCoord: {x: 0.3991, y: 0.572},
        zoomRatio: 29.3777,
        ROIBox: [{overlay: {x: 0.3961, y: 0.5668, width: 0.009, height: 0.0089}}],
        maskName: ["Cortical glomerulus"]
    },
    r005: {
        panCoord: {x: 0.3959, y: 0.5238},
        zoomRatio: 20.6127,
        ROIBox: [{overlay: {x: 0.3946, y: 0.5179, width: 0.008, height: 0.008}}],
        maskName: ["Cortical glomerulus"]
    },
    r006: {
        panCoord: {x: 0.3736, y: 0.6929},
        zoomRatio: 20.6127,
        ROIBox: [{overlay: {x: 0.3693, y: 0.6877, width: 0.009, height: 0.0105}}],
        maskName: ["Cortical glomerulus"]
    },
    r011: {
        panCoord: {x: 0.3943, y: 0.3033},
        zoomRatio: 17.1773,
        ROIBox: [{overlay: {x: 0.385, y: 0.2935, width: 0.019, height: 0.0254}}],
        maskName: ["Cortical glomerulus"]
    },
    r012: {
        panCoord: {x: 0.3433, y: 0.1979},
        zoomRatio: 14.3144,
        ROIBox: [{overlay: {x: 0.3314, y: 0.1871, width: 0.021, height: 0.0166}}],
        maskName: ["Cortical glomerulus"]
    },
    r014: {
        panCoord: {x: 0.3412, y: 0.1624},
        zoomRatio: 20.6128,
        ROIBox: [{overlay: {x: 0.3303, y: 0.1519, width: 0.019, height: 0.0214}}],
        maskName: ["Cortical glomerulus"]
    },
    r015: {
        panCoord: {x: 0.3183, y: 0.1757},
        zoomRatio: 11.9287,
        ROIBox: [{overlay: {x: 0.3046, y: 0.1645, width: 0.023, height: 0.0217}}],
        maskName: ["Cortical glomerulus"]
    },
    r016: {
        panCoord: {x: 0.3769, y: 0.3061},
        zoomRatio: 14.3144,
        ROIBox: [{overlay: {x: 0.3647, y: 0.2945, width: 0.024, height: 0.0255}}],
        maskName: ["Cortical glomerulus"]
    },
    r018: {
        panCoord: {x: 0.3525, y: 0.6435},
        zoomRatio: 14.3144,
        ROIBox: [{overlay: {x: 0.34, y: 0.6306, width: 0.021, height: 0.0263}}],
        maskName: ["Cortical glomerulus"]
    },
    r021: {
        panCoord: {x: 0.3099, y: 0.3611},
        zoomRatio: 12.8392,
        ROIBox: [{overlay: {x: 0.2946, y: 0.3499, width: 0.028, height: 0.0154}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r022: {
        panCoord: {x: 0.2691, y: 0.2307},
        zoomRatio: 12.8392,
        ROIBox: [{overlay: {x: 0.2555, y: 0.2155, width: 0.021, height: 0.0225}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r024: {
        panCoord: {x: 0.3071, y: 0.542},
        zoomRatio: 18.4884,
        ROIBox: [{overlay: {x: 0.3024, y: 0.5324, width: 0.01, height: 0.0172}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    // best-in-class (juxtamedullary) glomerulus
    r028: {
        panCoord: {x: 0.1638, y: 0.6154},
        zoomRatio: 22.1861,
        ROIBox: [{overlay: {x: 0.1574, y: 0.61, width: 0.01, height: 0.0087}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r029: {
        panCoord: {x: 0.0982, y: 0.6192},
        zoomRatio: 18.4885,
        ROIBox: [{overlay: {x: 0.0938, y: 0.6121, width: 0.01, height: 0.0097}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r030: {
        panCoord: {x: 0.0795, y: 0.6121},
        zoomRatio: 18.4884,
        ROIBox: [{overlay: {x: 0.0756, y: 0.6047, width: 0.01, height: 0.0086}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r031: {
        panCoord: {x: 0.2565, y: 0.5855},
        zoomRatio: 22.1862,
        ROIBox: [{overlay: {x: 0.2489, y: 0.5804, width: 0.011, height: 0.0087}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r032: {
        panCoord: {x: 0.3115, y: 0.5631},
        zoomRatio: 15.4071,
        ROIBox: [{overlay: {x: 0.2978, y: 0.5536, width: 0.0284, height: 0.0173}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r033: {
        panCoord: {x: 0.2695, y: 0.348},
        zoomRatio: 15.4071,
        ROIBox: [{overlay: {x: 0.2598, y: 0.3365, width: 0.018, height: 0.0173}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r034: {
        panCoord: {x: 0.2765, y: 0.3176},
        zoomRatio: 18.4885,
        ROIBox: [{overlay: {x: 0.2696, y: 0.3109, width: 0.01, height: 0.0107}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r035: {
        panCoord: {x: 0.2358, y: 0.3005},
        zoomRatio: 22.1862,
        ROIBox: [{overlay: {x: 0.2304, y: 0.2946, width: 0.008, height: 0.0075}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r036: {
        panCoord: {x: 0.1732, y: 0.6612},
        zoomRatio: 18.4885,
        ROIBox: [{overlay: {x: 0.1624, y: 0.6517, width: 0.018, height: 0.0159}}],
        maskName: ["Juxtamedullary glomerulus"]
    },
    r055: {
        panCoord: {x: 0.2312, y: 0.5238},
        zoomRatio: 12.8392,
        ROIBox: [{overlay: {x: 0.2154, y: 0.5079, width: 0.027, height: 0.0315}}],
        maskName: ["Collecting duct"]
    },
    // best in class collection duct
    r056: {
        panCoord: {x: 0.2156, y: 0.3925},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.2008, y: 0.3764, width: 0.031, height: 0.0312}}],
        maskName: ["Collecting duct"]
    },
    r057: {
        panCoord: {x: 0.0898, y: 0.5291},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.073, y: 0.5112, width: 0.027, height: 0.0318}}],
        maskName: ["Collecting duct"]
    },
    r058: {
        panCoord: {x: 0.2384, y: 0.4912},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.2189, y: 0.4724, width: 0.026, height: 0.031}}],
        maskName: ["Collecting duct"]
    },
    r059: {
        panCoord: {x: 0.1895, y: 0.2892},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.1684, y: 0.2699, width: 0.027, height: 0.0305}}],
        maskName: ["Collecting duct"]
    },
    r060: {
        panCoord: {x: 0.1874, y: 0.2095},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.1705, y: 0.1931, width: 0.0321, height: 0.0317}}],
        maskName: ["Collecting duct"]
    },
    r007: {
        panCoord: {x: 0.3449, y: 0.6931},
        zoomRatio: 15.4069,
        ROIBox: [{overlay: {x: 0.3357, y: 0.6807, width: 0.019, height: 0.0232}}],
        maskName: ["Cortical filtration membrane"]
    },
    r008: {
        panCoord: {x: 0.3734, y: 0.6164},
        zoomRatio: 12.8391,
        ROIBox: [{overlay: {x: 0.3598, y: 0.6027, width: 0.027, height: 0.0241}}],
        maskName: ["Cortical filtration membrane"]
    },
    r009: {
        panCoord: {x: 0.3877, y: 0.4701},
        zoomRatio: 12.8391,
        ROIBox: [{overlay: {x: 0.3741, y: 0.4552, width: 0.029, height: 0.028}}],
        maskName: ["Cortical filtration membrane"]
    },
    r010: {
        panCoord: {x: 0.379, y: 0.4412},
        zoomRatio: 12.8391,
        ROIBox: [{overlay: {x: 0.3637, y: 0.4324, width: 0.027, height: 0.0143}}],
        maskName: ["Cortical filtration membrane"]
    },
    r013: {
        panCoord: {x: 0.3399, y: 0.2463},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.3271, y: 0.2311, width: 0.024, height: 0.0248}}],
        maskName: ["Cortical filtration membrane"]
    },
    r017: {
        panCoord: {x: 0.4162, y: 0.3814},
        zoomRatio: 12.8392,
        ROIBox: [{overlay: {x: 0.4001, y: 0.372, width: 0.026, height: 0.0199}}],
        maskName: ["Cortical filtration membrane"]
    },
    r043: {
        panCoord: {x: 0.3285, y: 0.1621},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.3155, y: 0.1489, width: 0.0231, height: 0.0244}}],
        maskName: ["Distal convoluted tubule"]
    },
    r044: {
        panCoord: {x: 0.4145, y: 0.4864},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.4011, y: 0.4759, width: 0.0321, height: 0.029}}],
        maskName: ["Distal convoluted tubule"]
    },
    r045: {
        panCoord: {x: 0.4295, y: 0.4459},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.4133, y: 0.4284, width: 0.0313, height: 0.0313}}],
        maskName: ["Distal convoluted tubule"]
    },
    // best-in-class distal convoluted tubule
    r046: {
        panCoord: {x: 0.3321, y: 0.2974},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.3187, y: 0.2807, width: 0.0325, height: 0.0322}}],
        maskName: ["Distal convoluted tubule"]
    },
    r047: {
        panCoord: {x: 0.344, y: 0.3815},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.3283, y: 0.3662, width: 0.0321, height: 0.0306}}],
        maskName: ["Distal convoluted tubule"]
    },
    r048: {
        panCoord: {x: 0.4025, y: 0.6146},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.3928, y: 0.5993, width: 0.0308, height: 0.0307}}],
        maskName: ["Distal convoluted tubule"]
    },
    r019: {
        panCoord: {x: 0.2894, y: 0.5011},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.2754, y: 0.4891, width: 0.027, height: 0.0226}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    // best-in-class (juxtamedullary) filtration membrane
    r020: {
        panCoord: {x: 0.2888, y: 0.3332},
        zoomRatio: 12.8392,
        ROIBox: [{overlay: {x: 0.2753, y: 0.3218, width: 0.024, height: 0.0221}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    r023: {
        panCoord: {x: 0.108, y: 0.6487},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.0929, y: 0.6431, width: 0.026, height: 0.0138}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    r025: {
        panCoord: {x: 0.3408, y: 0.5064},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.3329, y: 0.4911, width: 0.018, height: 0.0293}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    r026: {
        panCoord: {x: 0.3042, y: 0.3865},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.2871, y: 0.373, width: 0.027, height: 0.026}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    r027: {
        panCoord: {x: 0.2822, y: 0.2895},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.2699, y: 0.274, width: 0.024, height: 0.0296}}],
        maskName: ["Juxtamedullary filtration membrane"]
    },
    r049: {
        panCoord: {x: 0.0789, y: 0.4513},
        zoomRatio: 10.6993,
        ROIBox: [{overlay: {x: 0.0614, y: 0.4353, width: 0.027, height: 0.0315}}],
        maskName: ["Loop of Henle"]
    },
    // best-in-class loop of Henle
    r050: {
        panCoord: {x: 0.0843, y: 0.4796},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.0681, y: 0.4669, width: 0.027, height: 0.0315}}],
        maskName: ["Loop of Henle"]
    },
    r051: {
        panCoord: {x: 0.0886, y: 0.414},
        zoomRatio: 8.9161,
        ROIBox: [{overlay: {x: 0.071, y: 0.3958, width: 0.029, height: 0.0318}}],
        maskName: ["Loop of Henle"]
    },
    r052: {
        panCoord: {x: 0.1158, y: 0.2595},
        zoomRatio: 12.3835,
        ROIBox: [{overlay: {x: 0.0998, y: 0.2438, width: 0.027, height: 0.0311}}],
        maskName: ["Loop of Henle"]
    },
    r053: {
        panCoord: {x: 0.0722, y: 0.3048},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.0566, y: 0.2907, width: 0.027, height: 0.0323}}],
        maskName: ["Loop of Henle"]
    },
    r054: {
        panCoord: {x: 0.1095, y: 0.4946},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.0972, y: 0.4788, width: 0.027, height: 0.0318}}],
        maskName: ["Loop of Henle"]
    },
    r037: {
        panCoord: {x: 0.2669, y: 0.6152},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.2513, y: 0.6011, width: 0.026, height: 0.0258}}],
        maskName: ["Proximal convoluted tubule"]
    },
    r038: {
        panCoord: {x: 0.2853, y: 0.6512},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.2714, y: 0.637, width: 0.0312, height: 0.0317}}],
        maskName: ["Proximal convoluted tubule"]
    },
    r039: {
        panCoord: {x: 0.2567, y: 0.6588},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.2426, y: 0.6502, width: 0.028, height: 0.0219}}],
        maskName: ["Proximal convoluted tubule"]
    },
    r040: {
        panCoord: {x: 0.3269, y: 0.2029},
        zoomRatio: 8.5997,
        ROIBox: [{overlay: {x: 0.3094, y: 0.1851, width: 0.025, height: 0.0256}}],
        maskName: ["Proximal convoluted tubule"]
    },
    // best-in-class proximal convoluted tubule
    r041: {
        panCoord: {x: 0.3132, y: 0.2196},
        zoomRatio: 14.3333,
        ROIBox: [{overlay: {x: 0.3019, y: 0.2095, width: 0.025, height: 0.0258},
                storyNum:1, waypointNum: 1}],
        maskName: ["Proximal convoluted tubule"]
    },
    r042: {
        panCoord: {x: 0.3531, y: 0.2351},
        zoomRatio: 10.3196,
        ROIBox: [{overlay: {x: 0.3458, y: 0.2272, width: 0.025, height: 0.016}}],
        maskName: ["Proximal convoluted tubule"]
    }
}

// Polygon objects for adding drawings over the slide image
const allSlidePolygons = {
    medulla: {
        file: slideMedulla,
        polygonID: 'slideMedulla',
    },
    cortex: {
        file: slideCortex,
        polygonID: 'slideCortex'
    }
}

function buildWaypointCartoon(waypointNum, storyNum, domElement, osd, finish_waypoint) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const showdown_text = new showdown.Converter({tables: true});
    
    if (waypointNum === 0 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/grossKidneyWithOverlays.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'grossAnatomyCartoon';
        svgContainer.onload = function(){
            const doc = this.getSVGDocument();
            Object.entries(allSlidePolygons).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addPolygon'], storyNum, waypointNum);
                }
            });
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 1 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/kidneySubstructuresWithClickables.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'detailedCartoon';
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function(){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el){
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum);
                }
            });
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 2 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/GenesDetected.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'plotSvg'
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const collDuct = doc.querySelector('#collDuct');
            collDuct.addEventListener('click', () => addMask(osd, ["Collecting duct"]));
            const loop = doc.querySelector('#loop');
            loop.addEventListener('click', () => addMask(osd, ["Loop of Henle"]));
            const dct = doc.querySelector('#dct');
            dct.addEventListener('click', () => addMask(osd, ["Distal convoluted tubule"]));
            const pct = doc.querySelector('#pct');
            pct.addEventListener('click', () => addMask(osd, ["Proximal convoluted tubule"]));
            const corGlom = doc.querySelector('#corGlom');
            corGlom.addEventListener('click', () => addMask(osd, ["Cortical glomerulus"]));
            const medGlom = doc.querySelector('#medGlom');
            medGlom.addEventListener('click', () => addMask(osd, ["Juxtamedullary glomerulus"]));
            const medFiltMem = doc.querySelector('#medFiltMem');
            medFiltMem.addEventListener('click', () => addMask(osd, ["Juxtamedullary filtration membrane"]));
            const corFiltMem = doc.querySelector('#corFiltMem');
            corFiltMem.addEventListener('click', () => addMask(osd, ["Cortical filtration membrane"]));
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if(el){
                   addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum) ;
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 3 && storyNum === 1) {
        const svgLegend2 = document.createElement('object');
        svgLegend2.data = 'svg/maskType.svg';
        svgLegend2.type = 'image/svg+xml';
        svgLegend2.id = 'legend2Svg';
        svgLegend2.onload = function (){
            const doc = this.getSVGDocument();
            const collDuct = doc.querySelector('#collDuct');
            collDuct.addEventListener('click', () => addMask(osd, ["Collecting duct"]));
            const loop = doc.querySelector('#loop');
            loop.addEventListener('click', () => addMask(osd, ["Loop of Henle"]));
            const dct = doc.querySelector('#dct');
            dct.addEventListener('click', () => addMask(osd, ["Distal convoluted tubule"]));
            const pct = doc.querySelector('#pct');
            pct.addEventListener('click', () => addMask(osd, ["Proximal convoluted tubule"]));
            const corGlom = doc.querySelector('#corGlom');
            corGlom.addEventListener('click', () => addMask(osd, ["Cortical glomerulus"]));
            const medGlom = doc.querySelector('#medGlom');
            medGlom.addEventListener('click', () => addMask(osd, ["Juxtamedullary glomerulus"]));
            const medFiltMem = doc.querySelector('#medFiltMem');
            medFiltMem.addEventListener('click', () => addMask(osd, ["Juxtamedullary filtration membrane"]));
            const corFiltMem = doc.querySelector('#corFiltMem');
            corFiltMem.addEventListener('click', () => addMask(osd, ["Cortical filtration membrane"]));
            finish_waypoint('')
        };
        domElement.appendChild(svgLegend2);
        
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/cellTypeDeconPlot.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'plotSvg';
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const collDuct = doc.querySelector('#collDuctPlot');
            collDuct.addEventListener('click', () => addMask(osd, ["Collecting duct"]));
            const loop = doc.querySelector('#loopPlot');
            loop.addEventListener('click', () => addMask(osd, ["Loop of Henle"]));
            const dct = doc.querySelector('#dctPlot');
            dct.addEventListener('click', () => addMask(osd, ["Distal convoluted tubule"]));
            const pct = doc.querySelector('#pctPlot');
            pct.addEventListener('click', () => addMask(osd, ["Proximal convoluted tubule"]));
            const corGlom = doc.querySelector('#corGlomPlot');
            corGlom.addEventListener('click', () => addMask(osd, ["Cortical glomerulus"]));
            const medGlom = doc.querySelector('#medGlomPlot');
            medGlom.addEventListener('click', () => addMask(osd, ["Juxtamedullary glomerulus"]));
            const medFiltMem = doc.querySelector('#medFiltMemPlot');
            medFiltMem.addEventListener('click', () => addMask(osd, ["Juxtamedullary filtration membrane"]));
            const corFiltMem = doc.querySelector('#corFiltMemPlot');
            corFiltMem.addEventListener('click', () => addMask(osd, ["Cortical filtration membrane"]));
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if(el){
                   addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum) ;
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
        
        const svgLegend1 = document.createElement('object');
        svgLegend1.data = 'svg/cellTypeDeconLegend1.svg';
        svgLegend1.type = 'image/svg+xml';
        svgLegend1.id = 'legend1Svg';
        domElement.appendChild(svgLegend1);
    }

    else if (waypointNum === 4 && storyNum === 1) {
        const svgLegend1 = document.createElement('object');
        svgLegend1.data = 'svg/heatmapLegend.svg';
        svgLegend1.type = 'image/svg+xml';
        svgLegend1.id = 'legend1Svg';
        domElement.appendChild(svgLegend1)

        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/heatmap.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'plotSvg';
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el){
                   addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum); 
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
        
        //insert table that matches the heatmap pathways to their abbreviation below the heatmap in the waypoint.
        const tableDiv = document.createElement('div');
        tableDiv.id = 'pathwayTable'
        const pathways = "| Abbr. | Full Gene Set Name |\n|:---------|:---------------------------------------------|\n| ABC| ABC transporters |\n|SLC13   | Human Na+-sulfate/carboxylate cotransporter|\n| SLC22| Organic cation/anion/zwitterion transporter|\n| OCT| Organic cation transporter (OCT) family|\n|SLC17| Vesicular glutamate transporter|\n| SLC5 | Sodium glucose cotransporter|\n| SLC36 | Proton-coupled amino acid transporter|\n| SLC2 | Facilitative GLUT transporter|\
        \n| SLC34 | Type II Na+-phosphate cotransporter |\n|SLC16| Monocarboxylate transporter|\n| SLC6 | Sodium- and chloride-dependent neurotransmitter transporter |\n| SLC23 | Na+-dependent ascorbic acid transporter|\n| SLC4 | Bicarbonate transporter |\n| SLC38| System A and System N sodium-coupled neutral amino acid transporter |\n| SLC42 | Rh ammonium transporter|\n| SLC21 | SLC21/ASLCO: Organic anion transporter |\n| SLC44 | Choline-like transporter|\n| SLC39 | Metal ion transporter";
        const table_html = showdown_text.makeHtml(pathways)
        tableDiv.innerHTML = table_html
        domElement.appendChild(tableDiv)
    }
    
    else if (waypointNum === 5 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/Cortical glomerulus vs Juxtamedullary glomerulus.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'volcanoPlot';
        svgContainer.onload = function() {
            const doc = this.getSVGDocument();
            const corticalGlomerulus = doc.querySelector('#corGlom');
            corticalGlomerulus.addEventListener('click', () => addMask(osd, ["Cortical glomerulus"]));
            const juxtamedullaryGlomerulus = doc.querySelector('#juxtGlom');
            juxtamedullaryGlomerulus.addEventListener('click', () => addMask(osd, ["Juxtamedullary glomerulus"]));
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
    }
}

// Add cartoon image to a specific waypoint
// Change the number that HS.w is equal to based on which waypoint the image needs to appear on.
// If the waypoint is the first one after the Table of Contents HS.s must also be set, otherwise, it appears in the TOC too
document.addEventListener('waypointBuildEvent', function(e) {
    const {waypointNum, storyNum, domElement, osd, finish_waypoint} = e.detail;
    window.waypointAttr = {
        waypointNum: waypointNum,
        storyNum: storyNum,
        domElement: domElement,
        osd: osd,
    }
    // Remove polygons and overlays when the waypoint is changed
    const overlayIds = ['#slideMedulla', '#slideCortex']
    for (let id of overlayIds) {
        if (document.querySelector(id)) {
            document.querySelector(id).remove();
        }
    }
    if (document.querySelector('[id^=ROIBox]')){
        const ROIBoxes = document.querySelectorAll('[id^=ROIBox]')
        for (let box of ROIBoxes){
            osd.viewer.removeOverlay(box.id)  
            document.querySelector(`#${box.id}`).remove()
        }
    }
    buildWaypointCartoon(waypointNum, storyNum, domElement, osd, finish_waypoint)
    }
);


const css = `
#logoDiv {
    display: flex;
    align-items: center;
    justify-content: center;
}
#logoDiv img {
    width:50%;
}
@media (min-width: 1100px) {
    .minerva-root .minerva-sidebar-menu {
        width: 450px !important;
    }
    .minerva-root .minerva-sidebar-menu.toggled {
        margin-left: -420px !important;
    }
    .minerva-root .openseadragon-canvas {
        left: 100px !important;
    }
}

@media (max-width: 1099px) {
    .minerva-root .openseadragon-canvas {
        left: 50px !important;
    }
}

@media (max-width: 674px) {
    .minerva-root .minerva-sidebar-menu {
        width: 200px !important;
    }
    .minerva-root .minerva-sidebar-menu.toggled {
        margin-left: -185px !important;
    }
}
`;

export const story = {
    'css': css
};

const styleElement = document.createElement('style');
styleElement.innerText = css;
document.head.appendChild(styleElement);