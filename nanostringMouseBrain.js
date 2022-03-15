const slideCortex = require('./mouseBrainObjects/cortex.json');
const slideCaudoputamen = require('./mouseBrainObjects/caudoputamen.json');
const slideAmygdala = require('./mouseBrainObjects/amygdala.json');
const slideCorticospinalTract = require('./mouseBrainObjects/corticospinalTract.json');
const slideCa1 = require('./mouseBrainObjects/ca1.json');
const slideHippocampus = require('./mouseBrainObjects/hippocampus.json');
const slideHypothalamus = require('./mouseBrainObjects/hypothalamus.json');
const slideLateralHabenula = require('./mouseBrainObjects/lateralHabenula.json');
const slideMedialHabenula = require('./mouseBrainObjects/medialHabenula.json');
const slideMN = require('./mouseBrainObjects/mediodorsalNucleus.json');
const slideTPVN = require('./mouseBrainObjects/thalamicParaventricularNucleus.json');
const slideThalamus = require('./mouseBrainObjects/thalamus.json');
const slideVPN = require('./mouseBrainObjects/ventralPosteromedialNucleus.json');
const slideVMHN = require('./mouseBrainObjects/ventromedialHypothalamicNucleus.json');
const slideCA2 = require('./mouseBrainObjects/ca2.json');
const slideCA3 = require('./mouseBrainObjects/ca3.json');
const dentateGyrus = require('./mouseBrainObjects/DentateGyrus.json');
const choroidPlexus = require('./mouseBrainObjects/choroidPlexus.json');

import { addEListener, addMask } from './nanostringUtils';

const allROIs = {
    // best-in-class Cortical layer I (Full ROI)
    r043: {
        panCoord: {x: 0.1800, y: 0.6544},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1554, y: 0.6333, width: 0.0492, height: 0.0421}}],
        maskName: ["Cortical layer I"]
    },
    // best-in-class Cortical layer II/III (Full ROI)
    r044: {
        panCoord: {x: 0.1857, y: 0.6425},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1609, y: 0.6202, width: 0.0496, height: 0.0447}}],
        maskName: ["Cortical layer II/III"]
    },
    // best-in-class Cortical layer IV (Full ROI)
    r045: {
        panCoord: {x: 0.1991, y: 0.6291},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1816, y: 0.6139, width: 0.0351, height: 0.0305}}],
        maskName: ["Cortical layer IV"]
    },
    // best-in-class Cortical layer V (Full ROI)
    r046: {
        panCoord: {x: 0.2108, y: 0.6177},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1894, y: 0.5997, width: 0.0428, height: 0.0361}}],
        maskName: ["Cortical layer V"]
    },
    // best-in-class Cortical layer VI (Full ROI)
    r047: {
        panCoord: {x: 0.2274, y: 0.6035},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.2053, y: 0.5841, width: 0.0443, height: 0.0387}}],
        maskName: ["Cortical layer VI"]
    },
    // best-in-class Cortical layer V (NeuN+)
    r051NeuN: {
        panCoord: {x: 0.1830, y: 0.5872},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1621, y: 0.5646, width: 0.0418, height: 0.0452}}],
        maskName: ["Cortical layer VI - NeuN+"]
    },
    // best-in-class Cortical layer V (DNA)
    r051Neuropil: {
        panCoord: {x: 0.1830, y: 0.5872},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.1621, y: 0.5646, width: 0.0418, height: 0.0452}}],
        maskName: ["Cortical layer VI - Neuropil"]
    }
}

// Polygon objects for adding drawings over slide image
const allSlidePolygons = {
    cortex: {
        polygonID: 'slideCortex',
        file: slideCortex
    },
    caudoputamen: {
        polygonID: 'slideCaudoputamen',
        file: slideCaudoputamen
    },
    amygdala: {
        polygonID: 'slideAmygdala',
        file: slideAmygdala
    },
    internalCapsule: {
        polygonID: 'slideInternalCapsule',
        file: slideCorticospinalTract
    },
    Hippocampus_CA1: {
        polygonID: 'CA1',
        file: slideCa1
    },
    Hippocampus_CA2: {
        polygonID: 'CA2',
        file: slideCA2
    },
    Hippocampus_CA3: {
        polygonID: 'CA3',
        file: slideCA3
    },
    hippocampus: {
        polygonID: 'slideHippocampus',
        file: slideHippocampus
    },
    HypothalamusBackground: {
        polygonID: 'slideHypothalamus',
        file: slideHypothalamus
    },
    lateralHabenula: {
        polygonID: 'slideLateralHabenula',
        file: slideLateralHabenula
    },
    medialHabenula: {
        polygonID: 'slideMedialHabenula',
        file: slideMedialHabenula
    },
    MediodorsalNucleus: {
        polygonID: 'slideMT',
        file: slideMN
    },
    paraventricularNucleus: {
        polygonID: 'slideTPVN',
        file: slideTPVN
    },
    thalamusBackground: {
        polygonID: 'slideThalamus',
        file: slideThalamus
    },
    VentralPosteromedialNucleus: {
        polygonID: 'slideVPN',
        file: slideVPN
    },
    VentromedialHypothalamicNucleus: {
        polygonID: 'slideVMHN',
        file: slideVMHN
    },
    DentateGyrus: {
        polygonID: 'DentateGyrus',
        file: dentateGyrus
    },
    choroidPlexus: {
        polygonID: 'choroidPlexus',
        file: choroidPlexus
    }
}



function buildWaypoint(waypointNum, storyNum, domElement, osd, finish_waypoint) {
    const showdown_text = new showdown.Converter({tables: true});

    if (waypointNum === 0 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/MouseBrain_gross.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'detailImage'
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allSlidePolygons).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addPolygon'], storyNum, waypointNum);
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 4 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/muBrainDetail.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'detailImage'
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum);
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 9 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/volcano_plot.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'volcano_plot'
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const caudoputamen = doc.querySelector('#caudoputamen');
            caudoputamen.addEventListener('click', () => addMask(osd, ["Caudoputamen - NeuN+"]));
            const amygdala= doc.querySelector('#amygdala');
            amygdala.addEventListener('click', () => addMask(osd, ["Amygdala - NeuN+"]));
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }
}

// Add cartoon image or text to a specific waypoint
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
    const overlayIds = ['#slideCortex', '#slideCaudoputamen', '#slideAmygdala', '#slideInternalCapsule', '#CA1', '#CA2', '#CA3', '#slideHippocampus', "#slideHypothalamus", "#slideLateralHabenula", "#slideMedialHabenula", "#slideMT", "#slideTPVN", "#slideThalamus", "#slideVPN", "#slideVMHN", "#DentateGyrus", "#choroidPlexus"]
    overlayIds.forEach((id) => {
        if (document.querySelector(id)) {
            document.querySelector(id).remove();
        }
    });

    if (document.querySelector('[id^=ROIBox]')){
        const ROIBoxes = document.querySelectorAll('[id^=ROIBox]')
        ROIBoxes.forEach((box) => {
            osd.viewer.removeOverlay(box.id)  
            document.querySelector(`#${box.id}`).remove()
        });
    }
    buildWaypoint(waypointNum, storyNum, domElement, osd, finish_waypoint)
    }
);




const css = `
@media (min-width: 1100px) {
    .minerva-root .minerva-sidebar-menu {
        width: 455px !important;
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
        width: 250px !important;
    }
    .minerva-root .minerva-sidebar-menu.toggled {
        margin-left: -185px !important;
    }

`;

export const story = {
    'css': css
};

const styleElement = document.createElement('style');
styleElement.innerText = css;
document.head.appendChild(styleElement);