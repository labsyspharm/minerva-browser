import { addEListener } from './nanostringUtils';

const allROIs = {
    // best-in-class full ROI of Germinal center
    r004: {
        panCoord: {x: 0.5227, y: 0.3764},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.5046, y: 0.3617, width: 0.024, height: 0.025}}],
        maskNum: [1],
        channel: [0]
    },
    // best-in-class full ROI of B cell zone/Mantle zone
    r005: {
        panCoord: {x: 0.5227, y: 0.3764},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.5087, y: 0.3585, width: 0.027, height: 0.0198}}],
        maskNum: [5],
        channel: [0]
    },
    // best-in-class full ROI of T cell zone
    r006: {
        panCoord: {x: 0.5227, y: 0.3764},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.4982, y: 0.3704, width: 0.026, height: 0.0244}}],
        maskNum: [6],
        channel: [0]
    },
    // best-in-class Germinal center - CD11c
    r028cd11c: {
        panCoord: {x: 0.1039, y: 0.51},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.0635, y: 0.5049, width: 0.03, height: 0.0345}}],
        maskNum: [2],
        channel: [0]
    },
    // best-in-class Germinal center - CD20
    r028cd20: {
        panCoord: {x: 0.1039, y: 0.51},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.0635, y: 0.5049, width: 0.03, height: 0.0345}}],
        maskNum: [3],
        channel: [0]
    },
    // best-in-class Germinal center - CD3
    r028cd3: {
        panCoord: {x: 0.1039, y: 0.51},
        zoomRatio: 5.6315,
        ROIBox: [{overlay: {x: 0.0635, y: 0.5049, width: 0.03, height: 0.0345}}],
        maskNum: [4],
        channel: [0]
    },
}

const slideImageRect = {
    name: 'slideImage',
    panCoord: {x: 0.3333, y: 0.4861},
    zoomRatio: 0.7298,
    ROIBox: [{overlay: {x: 0.0421, y: 0.0838, width: 0.57, height: 0.7946}}]
}

function buildWaypoint(waypointNum, storyNum, domElement, osd, finish_waypoint) {
    const showdown_text = new showdown.Converter({tables: true});

    if (waypointNum === 0 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'img/LymphNode_gross_white.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'grossImage'
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const slideImage = doc.querySelector('#slideImage');
            addEListener(osd, slideImageRect, slideImage, ['panZoom'], storyNum, waypointNum)
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 1 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'img/LymphNode_Detail.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'detailImage'
        // Add interactivity to the clickable regions in the cartoon image SVG
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum)
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);
    }
    else if (waypointNum === 0 && storyNum === 2) {
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
    'css': css,
    // other story config
};

const styleElement = document.createElement('style');
styleElement.innerText = css;
document.head.appendChild(styleElement);