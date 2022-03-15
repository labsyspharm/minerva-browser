import { addMask, addEListener } from './nanostringUtils';

const allROIs = {
    r001Alpha: {
        panCoord: {x: 0.6624, y: 0.4602},
        zoomRatio: 7.8648,
        ROIBox: [{overlay: {x: 0.6568, y: 0.4514, width: 0.017, height: 0.0208}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    r001Beta: {
        panCoord: {x: 0.6624, y: 0.4602},
        zoomRatio: 7.8648,
        ROIBox: [{overlay: {x: 0.6568, y: 0.4514, width: 0.017, height: 0.0208}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    r002Alpha: {
        panCoord: {x: 0.7596, y: 0.429},
        zoomRatio: 10.8415,
        ROIBox: [{overlay: {x: 0.7449, y: 0.419, width: 0.018, height: 0.0164}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    r002Beta: {
        panCoord: {x: 0.7596, y: 0.429},
        zoomRatio: 10.8415,
        ROIBox: [{overlay: {x: 0.7449, y: 0.419, width: 0.018, height: 0.0164}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    r003Alpha: {
        panCoord: {x: 0.5324, y: 0.5199},
        zoomRatio: 10.8415,
        ROIBox: [{overlay: {x: 0.5157, y: 0.5188, width: 0.025, height: 0.0125}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    r003Beta: {
        panCoord: {x: 0.5324, y: 0.5199},
        zoomRatio: 10.8415,
        ROIBox: [{overlay: {x: 0.5157, y: 0.5188, width: 0.025, height: 0.0125}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    // best-in-class Alpha cells
    r006Alpha: {
        panCoord: {x: 0.6395, y: 0.7144},
        zoomRatio: 15.9741,
        ROIBox: [{overlay: {x: 0.6261, y: 0.7058, width: 0.0183, height: 0.015}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    // best-in-class Beta cells
    r006Beta: {
        panCoord: {x: 0.6395, y: 0.7144},
        zoomRatio: 15.9741,
        ROIBox: [{overlay: {x: 0.6261, y: 0.7058, width: 0.0183, height: 0.015}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    r007: {
        panCoord: {x: 0.1778, y: 0.4728},
        zoomRatio: 11.4179,
        ROIBox: [{overlay: {x: 0.1647, y: 0.4632, width: 0.015, height: 0.0177}}],
        maskName: ["Islet"]
    },
    r008: {
        panCoord: {x: 0.3851, y: 0.662},
        zoomRatio: 11.4183,
        ROIBox: [{overlay: {x: 0.3752, y: 0.6541, width: 0.014, height: 0.0147}}],
        maskName: ["Islet"]
    },
    r009Alpha: {
        panCoord: {x: 0.4019, y: 0.5911},
        zoomRatio: 11.4179,
        ROIBox: [{overlay: {x: 0.3911, y: 0.584, width: 0.019, height: 0.0158}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    r009Beta: {
        panCoord: {x: 0.4019, y: 0.5911},
        zoomRatio: 11.4179,
        ROIBox: [{overlay: {x: 0.3911, y: 0.584, width: 0.019, height: 0.0158}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    // best-in-class islet
    r010: {
        panCoord: {x: 0.605, y: 0.8154},
        zoomRatio: 13.7014,
        ROIBox: [{overlay: {x: 0.6001, y: 0.8056, width: 0.016, height: 0.0141}}],
        maskName: ["Islet"]
    },
    r011Alpha: {
        panCoord: {x: 0.6032, y: 0.5092},
        zoomRatio: 11.4179,
        ROIBox: [{overlay: {x: 0.5909, y: 0.4995, width: 0.02, height: 0.0188}}],
        maskName: ["Alpha Cell Enriched Islet"]
    },
    r011Beta: {
        panCoord: {x: 0.6032, y: 0.5092},
        zoomRatio: 11.4179,
        ROIBox: [{overlay: {x: 0.5909, y: 0.4995, width: 0.02, height: 0.0188}}],
        maskName: ["Beta Cell Enriched Islet"]
    },
    r012: {
        panCoord: {x: 0.5971, y: 0.4761},
        zoomRatio: 13.7014,
        ROIBox: [{overlay: {x: 0.5878, y: 0.4669, width: 0.012, height: 0.0161}}],
        maskName: ["Islet"]
    },
    r013Acini: {
        panCoord: {x: 0.2085, y: 0.5782},
        zoomRatio: 6.6075,
        ROIBox: [{overlay: {x: 0.1823, y: 0.5643, width: 0.037, height: 0.0359}}],
        maskName: ["Acini cells"]
    },
    r013Duct: {
        panCoord: {x: 0.2085, y: 0.5782},
        zoomRatio: 6.6075,
        ROIBox: [{overlay: {x: 0.1823, y: 0.5643, width: 0.037, height: 0.0359}}],
        maskName: ["Duct"]
    },
    r014Acini: {
        panCoord: {x: 0.3895, y: 0.4685},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3697, y: 0.4562, width: 0.037, height: 0.0338}}],
        maskName: ["Acini cells"]
    },
    r014Duct: {
        panCoord: {x: 0.3895, y: 0.4685},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3697, y: 0.4562, width: 0.037, height: 0.0338}}],
        maskName: ["Duct"]
    },
    r015Acini: {
        panCoord: {x: 0.5535, y: 0.5097},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.5392, y: 0.4963, width: 0.035, height: 0.0346}}],
        maskName: ["Acini cells"]
    },
    r015Duct: {
        panCoord: {x: 0.5535, y: 0.5097},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.5392, y: 0.4963, width: 0.035, height: 0.0346}}],
        maskName: ["Duct"]
    },
    // best-in-class Duct
    r016Duct: {
        panCoord: {x: 0.7127, y: 0.5062},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.6822, y: 0.4872, width: 0.043, height: 0.0355}}],
        maskName: ["Duct"]
    },
    // best-in-class Acini
    r016Acini: {
        panCoord: {x: 0.7127, y: 0.5062},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.6822, y: 0.4872, width: 0.043, height: 0.0355}}],
        maskName: ["Acini cells"]
    },
    r017Acini: {
        panCoord: {x: 0.355, y: 0.6452},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3303, y: 0.6282, width: 0.035, height: 0.0347}}],
        maskName: ["Acini cells"]
    },
    r017Duct: {
        panCoord: {x: 0.355, y: 0.6452},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3303, y: 0.6282, width: 0.035, height: 0.0347}}],
        maskName: ["Duct"]
    },
    r018Acini: {
        panCoord: {x: 0.3522, y: 0.4545},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3304, y: 0.4393, width: 0.037, height: 0.0336}}],
        maskName: ["Acini cells"]
    },
    r018Duct: {
        panCoord: {x: 0.3522, y: 0.4545},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3304, y: 0.4393, width: 0.037, height: 0.0336}}],
        maskName: ["Duct"]
    },
    r019: {
        panCoord: {x: 0.2585, y: 0.5937},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.2291, y: 0.5786, width: 0.037, height: 0.0355}}],
        maskName: ["Acinus (Acini and duct)"]
    },
    r020: {
        panCoord: {x: 0.481, y: 0.6211},
        zoomRatio: 7.9288,
        ROIBox: [{overlay: {x: 0.4614, y: 0.604, width: 0.037, height: 0.0355}}],
        maskName: ["Acinus (Acini and duct)"]
    },
    r021: {
        panCoord: {x: 0.336, y: 0.7258},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.3062, y: 0.7061, width: 0.038, height: 0.0365}}],
        maskName: ["Acinus (Acini and duct)"]
    },
    r022: {
        panCoord: {x: 0.4734, y: 0.4669},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.4533, y: 0.4488, width: 0.035, height: 0.0318}}],
        maskName: ["Acinus (Acini and duct)"]
    },
    // best-in-class Acini Duct
    r023: {
        panCoord: {x: 0.6141, y: 0.2222},
        zoomRatio: 9.4378,
        ROIBox: [{overlay: {x: 0.5879, y: 0.2057, width: 0.037, height: 0.0355}}],
        maskName: ["Acinus (Acini and duct)"]
    },
    r024: {
        panCoord: {x: 0.2243, y: 0.6477},
        zoomRatio: 6.6073,
        ROIBox: [{overlay: {x: 0.1994, y: 0.6333, width: 0.038, height: 0.0354}}],
        maskName: ["Acinus (Acini and duct)"]
    }
}

const allSlidePolygons = {
    pancreasCartoon: {
    panCoord:{x: 0.5, y: 0.5},
    zoomRatio: 0.6128,
    ROIBox: [{overlay: {x: 0.1345, y: 0.0899, width: 0.731, height: 0.7891}}],
    }
}

function buildWaypointCartoon(waypointNum, storyNum, domElement, osd, finish_waypoint) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const showdown_text = new showdown.Converter({tables: true});

    if (waypointNum === 0 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.type = 'image/svg+xml';
        svgContainer.data = 'svg/pancreas.svg';
        svgContainer.id = 'grossAnatomyCartoon'
        svgContainer.onload = function(){
            const doc = this.getSVGDocument();
            Object.entries(allSlidePolygons).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['panZoom'], storyNum, waypointNum);
                }
            });
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
      }

    else if (waypointNum === 1 && storyNum === 1){
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/PancreasDetailOverlays.svg'
        svgContainer.type = 'image/svg+xml'
        svgContainer.id = 'substructures'
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el) {
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum);
                }
            });
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 2 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/LOQPlot.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'plotSvg';
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const acini = doc.querySelector('#acini');
            acini.addEventListener('click', () => addMask(osd, ["Acini cells"]));
            const islet = doc.querySelector('#islet');
            islet.addEventListener('click', () => addMask(osd, ["Islet"]));
            const aciniDuct = doc.querySelector('#aciniDuct');
            aciniDuct.addEventListener('click', () => addMask(osd, ["Acinus (Acini and duct)"]));
            const duct = doc.querySelector('#duct');
            duct.addEventListener('click', () => addMask(osd, ["Duct"]));
            const beta = doc.querySelector('#beta');
            beta.addEventListener('click', () => addMask(osd, ["Beta Cell Enriched Islet"]));
            const alpha = doc.querySelector('#alpha');
            alpha.addEventListener('click', () => addMask(osd, ["Alpha Cell Enriched Islet"]));
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

    else if (waypointNum === 3 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/cellDecon.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'plotSvg';
        svgContainer.onload = function (){
            const doc = this.getSVGDocument();
            const alpha = doc.querySelector('#alpha');
            alpha.addEventListener('click', () => addMask(osd, ["Alpha Cell Enriched Islet"]));
            const beta = doc.querySelector('#beta');
            beta.addEventListener('click', () => addMask(osd, ["Beta Cell Enriched Islet"]));
            const duct = doc.querySelector('#duct');
            duct.addEventListener('click', () => addMask(osd, ["Duct"]));
            const islet = doc.querySelector('#islet');
            islet.addEventListener('click', () => addMask(osd, ["Islet"]));
            const acini = doc.querySelector('#acini');
            acini.addEventListener('click', () => addMask(osd, ["Acini cells"]));
            const aciniDuct = doc.querySelector('#aciniDuct');
            aciniDuct.addEventListener('click', () => addMask(osd, ["Acinus (Acini and duct)"]));
            Object.entries(allROIs).forEach(([key, val]) => {
                const el = doc.querySelector(`#${key}`);
                if (el){
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum);
                }
            })
            finish_waypoint('');
        };
        domElement.appendChild(svgContainer);
    }

    else if (waypointNum === 4 && storyNum === 1) {
        const svgLegend1 = document.createElement('object');
        svgLegend1.data = 'svg/maskTypeLegend.svg';
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
                    addEListener(osd, val, el, ['addMask', 'panZoom'], storyNum, waypointNum)
                }
            })
            finish_waypoint('')
        };

        domElement.appendChild(svgContainer)

        //insert table that matches the heatmap pathways to their abbreviation below the heatmap in the waypoint.
        const tableDiv = document.createElement('div');
        tableDiv.id = 'pathwayTable'
        const table_showdown = new showdown.Converter({tables: true});
        const pathways = "| Abbr. | Full Gene Set Name |\n|---------|---------------------|\n| 1 | Pancreatic secretion  |\n| 2 | AGE-RAGE signaling pathway in diabetic complications  |\n| 3 | Pancreatic cancer |\n| 4 | Type I diabetes mellitus |\n| 5 | RTK class II (Insulin receptor family) |\n| 6 | Insulin signaling pathway |\n| 7 | Insulin resistance |\n| 8 | Maturity onset diabetes of the young |\n| 9 | Glucagon |\n| 10 | Glucagon signaling pathway |\n| 11 | Endocrine and other factor-regulated calcium reabsorption |\n| 12 | Insulin secretion |\n| 13 | Type II diabetes mellitus |";
        const table_html = table_showdown.makeHtml(pathways)
        tableDiv.innerHTML = table_html
        domElement.appendChild(tableDiv)
    }

    else if (waypointNum === 5 && storyNum === 1) {
        const svgContainer = document.createElement('object');
        svgContainer.data = 'svg/AlphaVsBetaCells_Transparent.svg';
        svgContainer.type = 'image/svg+xml';
        svgContainer.id = 'volcanoPlot';
        svgContainer.onload = function(){
            const doc = this.getSVGDocument();
            const alpha = doc.querySelector('#alpha');
            alpha.addEventListener('click', () => addMask(osd, ["Alpha Cell Enriched Islet"]));
            const beta = doc.querySelector('#beta');
            beta.addEventListener('click', () => addMask(osd, ["Beta Cell Enriched Islet"]));
            finish_waypoint('');
        }
        domElement.appendChild(svgContainer);
    }
};

document.addEventListener('waypointBuildEvent', function(e) {
    const {waypointNum, storyNum, domElement, osd, finish_waypoint} = e.detail;
    window.waypointAttr = {
        waypointNum: waypointNum,
        storyNum: storyNum,
        domElement: domElement,
        osd: osd,
    }
    // Remove polygons and overlays when the waypoint is changed
    if (document.querySelector('[id^=ROIBox]')){
        const ROIBoxes = document.querySelectorAll('[id^=ROIBox]');
        ROIBoxes.forEach((box) => {
            osd.viewer.removeOverlay(box.id)  
            document.querySelector(`#${box.id}`).remove()
        });  
    }

    buildWaypointCartoon(waypointNum, storyNum, domElement, osd, finish_waypoint);
});


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