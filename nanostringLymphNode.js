import { addMask, addEListener, buildCartoonImage, addHintText, addSlidePolygon} from './nanostringUtils';

const allROIs = {
    // best-in-class full ROI of Germinal center
    r004: {
        panCoord: {x: 0.775, y: 0.374},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.762, y: 0.371, width: 0.026, height: 0.017}}],
        maskNum: [1],
        channel: [0]
    },
    // best-in-class full ROI of B cell zone
    r005: {
        panCoord: {x: 0.783, y: 0.368},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.764, y: 0.359, width: 0.037, height: 0.018}}],
        maskNum: [5],
        channel: [0]
    },
    // best-in-class full ROI of T cell zone
    r006: {
        panCoord: {x: 0.766, y: 0.382},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.749, y: 0.371, width: 0.034, height: 0.023}}],
        maskNum: [6],
        channel: [0]
    },
    // best-in-class Germinal center - CD11c
    r028: {
        panCoord: {x: 0.117, y: 0.508},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.101, y: 0.508, width: 0.032, height: 0.030}}],
        maskNum: [2],
        channel: [0]
    },
    // best-in-class Germinal center - CD20
    r028: {
        panCoord: {x: 0.117, y: 0.508},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.101, y: 0.508, width: 0.032, height: 0.030}}],
        maskNum: [3],
        channel: [0]
    },
    // best-in-class Germinal center - CD3
    r028: {
        panCoord: {x: 0.117, y: 0.508},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.101, y: 0.508, width: 0.032, height: 0.030}}],
        maskNum: [4],
        channel: [0]
    },
}

function buildWaypoint(waypointNum, storyNum, domElement) {
    const showdown_text = new showdown.Converter({tables: true});
    if (waypointNum === 0 && storyNum === 2) {
        const lastpageTextDiv = document.createElement('div');
        lastpageTextDiv.id = 'lastPageText'
        const lastPageText = `For more information on NanoString GeoMx technology visit [**our website**](https://www.nanostring.com/products/geomx-digital-spatial-profiler/geomx-dsp-overview/).   
        \nDetails of the performance of WTA have been [**published**](https://doi.org/10.1101/2021.09.29.462442).   
        \nMinerva is an open-source software package that was developed by Laboratory of Systems Pharmacology at Harvard University and is available [**here**](https://github.com/labsyspharm/minerva-story/wiki).   
        We would like to thank Jeremy Muhlich and John Thomas Hoffer for assistance in enabling Minerva features to support the Spatial Organ Atlas.  
        \nSources:   
        Rashid R, Chen YA, Hoffer J, Muhlich JL, Lin JR, Krueger R, Pfister H, Mitchell R, Santagata S, and Sorger PK. Interpretative guides for interacting with tissue atlas and digital pathology data using the Minerva browser. BioRxiv. (2020) [https://doi.org/10.1101/2020.03.27.001834](https://doi.org/10.1101/2020.03.27.001834)
        \nHoffer J, Rashid R, Muhlich JL, Chen, YA, Russell D, Ruokonen J, Krueger R, Pfister H, Santagata S, Sorger PK. (2020). Minerva: a light-weight, narrative image browser for multiplexed tissue images. Journal of Open Source Software, 5(54), 2579, [https://doi.org/10.21105/joss.02579](https://doi.org/10.21105/joss.02579)
        \n\nFOR RESEARCH USE ONLY. Not for use in diagnostic procedures.`
        lastpageTextDiv.innerHTML = showdown_text.makeHtml(lastPageText);
        domElement.appendChild(lastpageTextDiv);
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
    if (document.querySelector('[id^=ROIBox]')){
        const ROIBoxes = document.querySelectorAll('[id^=ROIBox]')
        for (let box of ROIBoxes){
            osd.viewer.removeOverlay(box.id)  
            document.querySelector(`#${box.id}`).remove()
        }
    }
    buildWaypoint(waypointNum, storyNum, domElement)
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
    'css': css,
    // other story config
};

const styleElement = document.createElement('style');
styleElement.innerText = css;
document.head.appendChild(styleElement);