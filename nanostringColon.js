const slideColonicPatch = require('./slideColonicPatch.json');
import { addMask, addEListener, buildCartoonImage, addHintText, addSlidePolygon} from './nanostringUtils';


// Breakpoints for when to resize the cartoon image and subsequently redraw the corresponding SVGs
// Align with CSS breakpoints
const scrnWBps = [0, 675, 1100];

const allROIs = {
    // best-in-class epithelium
    r005Epi: {
        panCoord: {x: 0.5496, y: 0.6362},
        zoomRatio: 3.4445,
        ROIBox: [{overlay: {
            "x": 0.5362,
            "y": 0.6228,
            "width": 0.0268,
            "height": 0.0268
        }}],
        maskNum: [2]
    },
    // best-in-class lamina proprioa
    r005LamProp: {
        panCoord: {x: 0.5496, y: 0.6362},
        zoomRatio: 3.4445,
        ROIBox: [{overlay: {
            "x": 0.5362,
            "y": 0.6228,
            "width": 0.0268,
            "height": 0.0268
        }}],
        maskNum: [3]
    },
    // best-in-class colonic patch
    r007: {
        panCoord: {x: 0.367727, y: 0.531525},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.3604, y: 0.5242, width: 0.01467, height: 0.01467}}],
        maskNum: [1]
    },
    // best-in-class circular muscle layer
    r013: {
        panCoord: {x: 0.234, y: 0.3677},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2238, y: 0.3576, width: 0.0204, height: 0.0204}}],
        maskNum: [8]
    },
    // best-in-class longitudinal muscle layer
    r017: {
        panCoord: {x: 0.2469, y: 0.3944},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2367, y: 0.3842, width: 0.0204, height: 0.0204}}],
        maskNum: [9]
    },
    // best-in-class muscularis mucosae
    r024: {
        panCoord: {x: 0.5476, y: 0.5971},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.529, y: 0.5935, width: 0.0335, height: 0.0072}}],
        maskNum: [5]
    },
    // best-in-class enteroendocrine cells
    r032: {
        panCoord: {x: 0.2631, y: 0.2217},
        zoomRatio: 5.7556,
        ROIBox: [{overlay: {x: 0.24733, y: 0.2077, width: 0.038, height: 0.0329}}],
        maskNum: [4],
        channel: [2]
    },
    // best-in-class vessels
    r033: {
        panCoord: {x: 0.3386, y: 0.2590},
        zoomRatio: 4.7963,
        ROIBox: [{overlay: {x: 0.3295, y: 0.2519, width: 0.0182, height: 0.0143}}],
        maskNum: [6]
    },
    // best-in-class connective tissue
    r037: {
        panCoord: {x: 0.3282, y: 0.286},
        zoomRatio: 4.7963,
        ROIBox: [{overlay: {x: 0.318, y: 0.276, width: 0.0204, height: 0.0204}}],
        maskNum: [7]
    }
}

const grossDetailMuscleLayers = {
    name: 'grossDetailML',
    panCoord: {x: 0.5, y: 0.3407},
    zoomRatio: 0.5962,
    ROIBox: [{overlay: {x: 0.3735, y: 0.0011, width: 0.451, height: 0.3561}}],
}

const grossDetailColonicPatch = {
    name: 'grossDetailCP',
    panCoord: {x: 0.5, y: 0.5},
    zoomRatio: 0.6216,
    ROIBox: [{overlay: {x: 0.4398, y: 0.5893, width: 0.033, height: 0.02}}, {overlay: {x: 0.3505, y: 0.52, width: 0.033, height: 0.026}}, {overlay: {x: 0.3679, y: 0.239, width: 0.035, height: 0.024}}],
}


function buildWaypointCartoon(waypointNum, storyNum, windowInnerWidth, domElement, osd, finish_waypoint) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const showdown_text = new showdown.Converter({tables: true});

    if (waypointNum === 0 && storyNum === 0){
        // remove the home button
        document.querySelector('.minerva-home-button').style.display = 'none';
    }

    else if (waypointNum === 0 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svgs/colonGross.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'grossImage'
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const colonicPatch = doc.querySelector('#colonicPatch');
            addEListener(osd, grossDetailColonicPatch, colonicPatch, ['panZoom'], storyNum, waypointNum)
            const muscleLayers = doc.querySelector('#muscleLayers');
            addEListener(osd, grossDetailMuscleLayers, muscleLayers, ['panZoom'], storyNum, waypointNum);
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
        const hintText = ""
        const hintId = 'hintText';
        addHintText(hintText, hintId, showdown_text);
    }

    else if (waypointNum === 1 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svgs/colonDetail.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'detailImage'
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const cirMus = doc.querySelector('#circularMuscle');
            addEListener(osd, allROIs.r013, cirMus, ['addMask', 'panZoom'], storyNum, waypointNum);
            const longMus = doc.querySelector('#longitudinalMuscle');
            addEListener(osd, allROIs.r017, longMus, ['addMask', 'panZoom'], storyNum, waypointNum);
            const connTiss = doc.querySelector('#connectiveTissue');
            addEListener(osd, allROIs.r037, connTiss, ['addMask', 'panZoom'], storyNum, waypointNum);
            const epithelium = doc.querySelector('#epithelium');
            addEListener(osd, allROIs.r005Epi, epithelium, ['addMask', 'panZoom'], storyNum, waypointNum);
            const musMuc = doc.querySelector('#muscularisMucosae');
            addEListener(osd, allROIs.r024, musMuc, ['addMask', 'panZoom'], storyNum, waypointNum);
            const enteroCells = doc.querySelector('#enteroCells');
            addEListener(osd, allROIs.r032, enteroCells, ['addMaskAndChannel', 'panZoom'], storyNum, waypointNum);
            const colPatch = doc.querySelector('#colonicPatch');
            addEListener(osd, allROIs.r007, colPatch, ['addMask', 'panZoom'], storyNum, waypointNum);
            const vessels = doc.querySelector('#vessels');
            addEListener(osd, allROIs.r033, vessels, ['addMask', 'panZoom'], storyNum, waypointNum);
            const lamProp = doc.querySelector('#laminaPropria');
            addEListener(osd, allROIs.r005LamProp, lamProp, ['addMask', 'panZoom'], storyNum, waypointNum);
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
        const hintText = ""
        const hintId = 'hintText';
        addHintText(hintText, hintId, showdown_text);
    }
    }

// Add cartoon image to a specific waypoint
// Change the number that HS.w is equal to based on which waypoint the image needs to appear on.
// If the waypoint is the first one after the Table of Contents HS.s must also be set, otherwise, it appears in the TOC too
document.addEventListener('waypointBuildEvent', function(e) {
    const {waypointNum, storyNum, domElement, osd, finish_waypoint} = e.detail;
    const width = window.innerWidth;
    window.waypointAttr = {
        waypointNum: waypointNum,
        storyNum: storyNum,
        domElement: domElement,
        osd: osd,
        width: width
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
    buildWaypointCartoon(waypointNum, storyNum, width, domElement, osd, finish_waypoint)
    }
);


// window.addEventListener('resize', function (e){
//     const currW = e.target.window.innerWidth
//     const oldW = e.target.window.waypointAttr.width
//     if ((currW < scrnWBps[1] && oldW >= scrnWBps[1]) || (currW < scrnWBps[2] && oldW >= scrnWBps[2]) || (currW >= scrnWBps[2] && oldW < scrnWBps[2]) || (currW >= scrnWBps[1] && oldW < scrnWBps[1])) {
//         const {waypointNum, storyNum, domElement, osd} = e.target.window.waypointAttr;
//         const svgCont = ['#largeSvgContainer', '#mediumSvgContainer', '#smallSvgContainer']
//     svgCont.forEach((id) => {
//         if (document.querySelector(id)) {
//             document.querySelector(id).remove();
//         }
//     });
//         // The waypoints that have images that need resizing via buildWaypointCartoon
//         const waypointsToRebuild = []
//         // For this story, all storyNums, except the Table of Contents page, which doesn't need rebuilding, are 1
//         waypointsToRebuild.forEach((waypoint) => {
//             if (waypointNum === waypoint && storyNum === 1) {
//                 buildWaypointCartoon(waypointNum, storyNum, currW, domElement, osd);
//             }
//         });
//     } 
//     e.target.window.waypointAttr.width = currW
// });

const css = `
#logoDiv {
    display: flex;
    align-items: center;
    justify-content: center;
}
#logoDiv img {
    width:50%;
}
#grossImage {
    position: relative;
    width: 100%;
    height: 100%;
    vertical-align: middle;
    margin: 0;
    overflow: hidden;
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



@media (max-width: 1099px) {
    .minerva-root .openseadragon-canvas {
        left: 50px !important;
    }
}

@media (max-width: 674px) {
    .minerva-root .minerva-sidebar-menu {
        width: 250px !important;
    }
    .minerva-root .minerva-sidebar-menu.toggled {
        margin-left: -185px !important;
    }

`;

export const story = {
    'css': css,
    // other story config
};

const styleElement = document.createElement('style');
styleElement.innerText = css;
document.head.appendChild(styleElement);