import { svg } from 'd3-fetch';
import { addMask, addEListener, buildCartoonImage, addHintText, addSlidePolygon} from './nanostringUtils';


// Breakpoints for when to resize the cartoon image and subsequently redraw the corresponding SVGs
// Align with CSS breakpoints
const scrnWBps = [0, 675, 1100];

const allROIs = {
    r001Epi: {
        panCoord: {x: 0.4542, y: 0.1700},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4417, y: 0.1575, width: 0.025, height: 0.025}}],
        maskNum: [2],
        channel: [0]
    },
    r001LamProp: {
        panCoord: {x: 0.4542, y: 0.1700},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4417, y: 0.1575, width: 0.025, height: 0.025}}],
        maskNum: [3],
        channel: [0]
    },
    r002Epi: {
        panCoord: {x: 0.6168, y: 0.0225},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.6077, y: 0.0135, width: 0.018, height: 0.018}}],
        maskNum: [2],
        channel: [0]
    },
    r002LamProp: {
        panCoord: {x: 0.6168, y: 0.0225},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.6077, y: 0.0135, width: 0.018, height: 0.018}}],
        maskNum: [3],
        channel: [0]
    },
    r003Epi: {
        panCoord: {x: 0.3240, y: 0.6125},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3145, y: 0.6030, width: 0.0191, height: 0.0191}}],
        maskNum: [2],
        channel: [0]
    },
    r003LamProp: {
        panCoord: {x: 0.3240, y: 0.6125},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3145, y: 0.6030, width: 0.0191, height: 0.0191}}],
        maskNum: [3],
        channel: [0]
    },
    r004Epi: {
        panCoord: {x: 0.5522, y: 0.5821},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.5418, y: 0.5717, width: 0.0208, height: 0.0208}}],
        maskNum: [2],
        channel: [0]
    },
    r004LamProp: {
        panCoord: {x: 0.5522, y: 0.5821},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.5418, y: 0.5717, width: 0.0208, height: 0.0208}}],
        maskNum: [3],
        channel: [0]
    },
    // best-in-class epithelium
    r005Epi: {
        panCoord: {x: 0.5496, y: 0.6362},
        zoomRatio: 3.4445,
        ROIBox: [{overlay: {x: 0.5362, y: 0.6228, width: 0.0268, height: 0.0268}}],
        maskNum: [2],
        channel: [0]
    },
    // best-in-class lamina propria
    r005LamProp: {
        panCoord: {x: 0.5496, y: 0.6362},
        zoomRatio: 3.4445,
        ROIBox: [{overlay: {x: 0.5362, y: 0.6228, width: 0.0268, height: 0.0268}}],
        maskNum: [3],
        channel: [0]
    },
    r006Epi: {
        panCoord: {x: 0.6817, y: 0.7158},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.668, y: 0.702, width: 0.0275, height: 0.0275}}],
        maskNum: [2],
        channel: [0]
    },
    r006LamProp: {
        panCoord: {x: 0.6817, y: 0.7158},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.668, y: 0.702, width: 0.0275, height: 0.0275}}],
        maskNum: [3],
        channel: [0]
    },
    // best-in-class colonic patch
    r007: {
        panCoord: {x: 0.367727, y: 0.531525},
        zoomRatio: 3.8488,
        ROIBox: [{overlay: {x: 0.3604, y: 0.5242, width: 0.01467, height: 0.01467}}],
        maskNum: [1],
        channel: [0]
    },
    r008: {
        panCoord: {x: 0.4572, y: 0.5984},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4507, y: 0.5919, width: 0.013, height: 0.013}}],
        maskNum: [1],
        channel: [0]
    },
    r009: {
        panCoord: {x: 0.4122, y: 0.7005},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4067, y: 0.695, width: 0.011, height: 0.011}}],
        maskNum: [1],
        channel: [0]
    },
    r010: {
        panCoord: {x: 0.3849, y: 0.2522},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.375, y: 0.244, width: 0.0199, height: 0.0164}}],
        maskNum: [1],
        channel: [0]
    },
    r011: {
        panCoord: {x: 0.175, y: 0.7424},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.1695, y: 0.7368, width: 0.0111, height: 0.0111}}],
        maskNum: [1],
        channel: [0]
    },
    r012: {
        panCoord: {x: 0.3671, y: 0.6205},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3617, y: 0.6152, width: 0.0107, height: 0.0107}}],
        maskNum: [1],
        channel: [0]
    },
    // best-in-class circular muscle layer
    r013: {
        panCoord: {x: 0.234, y: 0.3677},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2238, y: 0.3576, width: 0.0204, height: 0.0204}}],
        maskNum: [8],
        channel: [0]
    },
    r014: {
        panCoord: {x: 0.3209, y: 0.3336},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3107, y: 0.3234, width: 0.0204, height: 0.0204}}],
        maskNum: [8],
        channel: [0]
    },
    r015: {
        panCoord: {x: 0.3949, y: 0.3135},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3847, y: 0.3033, width: 0.0204, height: 0.0204}}],
        maskNum: [8],
        channel: [0]
    },
    r016: {
        panCoord: {x: 0.4622, y: 0.2822},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4521, y: 0.2720, width: 0.0204, height: 0.0204}}],
        maskNum: [8],
        channel: [0]
    },
    // best-in-class longitudinal muscle layer
    r017: {
        panCoord: {x: 0.2469, y: 0.3944},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2367, y: 0.3842, width: 0.0204, height: 0.0204}}],
        maskNum: [9],
        channel: [0]
    },
    r018: {
        panCoord: {x: 0.3828, y: 0.3453},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3727, y: 0.3351, width: 0.0204, height: 0.0204}}],
        maskNum: [9],
        channel: [0]
    },
    r019: {
        panCoord: {x: 0.4536, y: 0.3221},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4434, y: 0.3119, width: 0.0204, height: 0.0204}}],
        maskNum: [9],
        channel: [0]
    },
    r020: {
        panCoord: {x: 0.5093, y: 0.3088},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4991, y: 0.2986, width: 0.0204, height: 0.0204}}],
        maskNum: [9],
        channel: [0]
    },
    r021: {
        panCoord: {x: 0.4631, y: 0.1957},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.4509, y: 0.1839, width: 0.0243, height: 0.0235}}],
        maskNum: [5],
        channel: [0]
    },
    r022: {
        panCoord: {x: 0.3427, y: 0.1975},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3335, y: 0.1777, width: 0.0183, height: 0.0396}}],
        maskNum: [5],
        channel: [0]
    },
    r023: {
        panCoord: {x: 0.5973, y: 0.0902},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.5855, y: 0.0779, width: 0.0237, height: 0.0248}}],
        maskNum: [5],
        channel: [0]
    },
    // best-in-class muscularis mucosae
    r024: {
        panCoord: {x: 0.5476, y: 0.5971},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.529, y: 0.5935, width: 0.0335, height: 0.0072}}],
        maskNum: [5],
        channel: [0]
    },
    r025: {
        panCoord: {x: 0.3552, y: 0.6417},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3465, y: 0.6266, width: 0.0174, height: 0.0301}}],
        maskNum: [5],
        channel: [0]
    },
    r026: {
        panCoord: {x: 0.5231, y: 0.5277},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.5064, y: 0.5223, width: 0.0333, height: 0.0109}}],
        maskNum: [5],
        channel: [0]
    },
    r027: {
        panCoord: {x: 0.5977, y: 0.6386},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.581, y: 0.6328, width: 0.0335, height: 0.0117}}],
        maskNum: [4],
        channel: [2]
    },
    r028: {
        panCoord: {x: 0.256, y: 0.7937},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2393, y: 0.7822, width: 0.0335, height: 0.0229}}],
        maskNum: [4],
        channel: [2]
    },
    r029: {
        panCoord: {x: 0.6902, y: 0.7904},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.6785, y: 0.7728, width: 0.0234, height: 0.0353}}],
        maskNum: [4],
        channel: [2]
    },
    r030: {
        panCoord: {x: 0.2616, y: 0.6599},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2451, y: 0.6488, width: 0.0329, height: 0.0222}}],
        maskNum: [4],
        channel: [2]
    },
    r031: {
        panCoord: {x: 0.3126, y: 0.8433},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2958, y: 0.8320, width: 0.0335, height: 0.0225}}],
        maskNum: [4],
        channel: [2]
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
        maskNum: [6],
        channel: [0]
    },
    r034: {
        panCoord: {x: 0.3143, y: 0.2603},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.3046, y: 0.2526, width: 0.0195, height: 0.0154}}],
        maskNum: [6],
        channel: [0]
    },
    r035: {
        panCoord: {x: 0.6233, y: 0.164},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.6107, y: 0.1566, width: 0.0252, height: 0.015}}],
        maskNum: [6],
        channel: [0]
    },
    r036: {
        panCoord: {x: 0.2237, y: 0.7041},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2103, y: 0.6939, width: 0.0268, height: 0.0204}}],
        maskNum: [6],
        channel: [0]
    },
    // best-in-class connective tissue
    r037: {
        panCoord: {x: 0.3282, y: 0.286},
        zoomRatio: 4.7963,
        ROIBox: [{overlay: {x: 0.318, y: 0.276, width: 0.0204, height: 0.0204}}],
        maskNum: [7],
        channel: [0]
    },
    r038: {
        panCoord: {x: 0.565, y: 0.1814},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.5548, y: 0.1712, width: 0.0204, height: 0.0204}}],
        maskNum: [7],
        channel: [0]
    },
    r039: {
        panCoord: {x: 0.292, y: 0.5537},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2818, y: 0.5435, width: 0.0204, height: 0.0204}}],
        maskNum: [7],
        channel: [0]
    },
    r040: {
        panCoord: {x: 0.2793, y: 0.7091},
        zoomRatio: 4.6183,
        ROIBox: [{overlay: {x: 0.2691, y: 0.6989, width: 0.0204, height: 0.0204}}],
        maskNum: [7],
        channel: [0]
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

    if (waypointNum === 0 && storyNum === 1) {
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

    else if (waypointNum === 4 && storyNum === 1){
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svgs/Wpt6-Heatmap.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'heatmap';
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addMaskAndChannel', 'panZoom'], storyNum, waypointNum)
                }
            });
            finish_waypoint('')
        }
        domElement.appendChild(svgContainer);

        //insert table that matches the heatmap pathways to their abbreviation below the heatmap in the waypoint.
        const tableDiv = document.createElement('div');
        tableDiv.id = 'pathwayTable'
        const table_showdown = new showdown.Converter({tables: true});
        const pathways = "| Abbr. | Full Gene Set Name |\n|-----|---------|\n| CMC | Caridac muscle contraction |\n| TMS | Tropomyosin |\n| VSM | Vascular smooth muscle contraction |\n| LTM | Leukocyte transendothelial migration |\n| PID | Primary immunodeficiency |\n| INI | Intestinal immune network for IgA production |\n| EEC | Exosomal proteins of epithelial cells |\n| ESC | Epithelial sodium channel (SCNN)";
        const table_html = table_showdown.makeHtml(pathways)
        tableDiv.innerHTML = table_html
        domElement.appendChild(tableDiv)
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
        \n\nIllustrations  by Dave Carlson/[CarlsonStockArt.com](https://www.carlsonstockart.com/)   
        \n\nFOR RESEARCH USE ONLY. Not for use in diagnostic procedures.`
        lastpageTextDiv.innerHTML = showdown_text.makeHtml(lastPageText);
        domElement.appendChild(lastpageTextDiv);
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