// Functions to build Rectangle, Ellipse, and Path SVGs
function buildRectSvg(osd, svgNS, rectObj, storyNum, waypointNum){
    const rectSvg = document.createElementNS(svgNS,'rect');
    rectSvg.id = rectObj.id;
    rectSvg.setAttribute('x', rectObj.x);
    rectSvg.setAttribute('y', rectObj.y);
    rectSvg.setAttribute('width', rectObj.width);
    rectSvg.setAttribute('height', rectObj.height);
    if (rectObj.rx){
        rectSvg.setAttribute('rx', rectObj.rx);
    }
    rectSvg.setAttribute('fill', rectObj.fill);
    rectSvg.setAttribute('stroke', rectObj.stroke);
    rectSvg.setAttribute('stroke-width', rectObj.strokeWidth)
    addEListener(osd, rectObj, rectSvg, rectObj.eventTypes, storyNum, waypointNum)
    return rectSvg
}

function buildEllipseSvg(osd, svgNS, ellipseObj, storyNum, waypointNum){
    const ellipseSvg = document.createElementNS(svgNS, 'ellipse');
    ellipseSvg.id = ellipseObj.id;
    ellipseSvg.setAttribute('cx', ellipseObj.cx);
    ellipseSvg.setAttribute('cy', ellipseObj.cy);
    ellipseSvg.setAttribute('rx', ellipseObj.rx);
    ellipseSvg.setAttribute('ry', ellipseObj.ry);
    ellipseSvg.setAttribute('fill', ellipseObj.fill);
    ellipseSvg.setAttribute('stroke', ellipseObj.stroke);
    ellipseSvg.setAttribute('stroke-width', ellipseObj.strokeWidth)
    addEListener(osd, ellipseObj, ellipseSvg, ellipseObj.eventTypes, storyNum, waypointNum)
    return ellipseSvg
}

function buildPathSvg(osd, svgNS, pathObj, storyNum, waypointNum){
    const pathSvg = document.createElementNS(svgNS, 'path');
    pathSvg.id = pathObj.id;
    pathSvg.setAttribute('d', pathObj.d);
    pathSvg.setAttribute('fill', pathObj.fill);
    pathSvg.setAttribute('stroke', pathObj.stroke);
    pathSvg.setAttribute('stroke-width', pathObj.strokeWidth)
    addEListener(osd, pathObj, pathSvg, pathObj.eventTypes, storyNum, waypointNum)
    return pathSvg
}

// Event Listener to pan and zoom to a specific place.
export function panZoom(osd, svgObj, storyNum, waypointNum) {
    const id = 'ROIBox'
    // Pan and Zoom to the 'Best in Class' ROI
    osd.viewer.viewport.panTo(svgObj.panCoord)
    osd.viewer.viewport.zoomTo(svgObj.zoomRatio)
    //If a 'Best in Class ROI is already highlighted, remove it and add a box around the new one
    if (document.querySelector(`[id^=${id}-`)){
        const ROIBoxes = document.querySelectorAll(`[id^=${id}-`)
        ROIBoxes.forEach((box) => {
            osd.viewer.removeOverlay(box.id)
            document.querySelector(`#${box.id}`).remove()
        })
        if (ROIBoxes[0].id === `${id}-${svgObj.name}-${1}`) {
            return
        }
        
    }
    for (let i=1; i <= (svgObj.ROIBox).length; i++){
        addROIBox(osd, svgObj.ROIBox[i-1], `${id}-${svgObj.name}-${i}`, storyNum, waypointNum)
    }
}

// Event listener for the SVGs - circles (or removes the ciricle of) the corresponding part on the slide when clicked.
function addSlidePolygon(polygonID, fileName, osd){
    if (!document.querySelector(`#${polygonID}`)) {
        osd.addPolygon(polygonID, fileName);
    } else {
        document.querySelector(`#${polygonID}`).remove();
    }
}

function addROIBox(osd, ROIBox, id, storyNum, waypointNum){
    const {overlay} = ROIBox
    osd.addOverlay(overlay, id, storyNum, waypointNum)
}


export function addMask(osd, maskNums) {
    // Add the mask to all the ROIs of the same structure
    // onpopstate seems to need a list longer than 1 so -1 is added
    osd.hashstate.m = [-1, ...maskNums]
    osd.hashstate.pushState();
    window.onpopstate();
}

export function addMaskAndChannel(osd, maskNums, channelNums) {
    osd.hashstate.m = [-1, ...maskNums]
    osd.hashstate.g = [...channelNums]
    osd.hashstate.pushState();
    window.onpopstate();
}

//Add Event Listeners to SVG elements based on attributes in their SVG object
export function addEListener(osd, svgObj, svg, eventTypes, storyNum, waypointNum) {
    svg.addEventListener('click', () => {
        eventTypes.forEach((eventType) => {
            switch (eventType) {
                case 'addPolygon':
                    addSlidePolygon(svgObj.polygonID, svgObj.file, osd)
                    break;
                case 'panZoom':
                    panZoom(osd, svgObj, storyNum, waypointNum)
                    break;
                case 'addMask':
                    addMask(osd, svgObj.maskNum);
                    break;
                case 'addMaskAndChannel':
                    if (svgObj.channel) {
                        addMaskAndChannel(osd, svgObj.maskNum, svgObj.channel)
                    } else {
                        throw new Error("No Channel specified")
                    }
                    break;
                default:
                    break;
            }
        })
    });   
}

// Build components on the waypoint: Cartoon image, SVG Node
function createSvgNode(){
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgNode = document.createElementNS(svgNS, 'svg');
    svgNode.setAttribute('xmlns', svgNS);
    svgNode.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    return svgNode
}

export function buildCartoonImage(osd, svgNS, id, imagePath, svgTypes, storyNum, waypointNum) {
    const cartoonImgContainer = document.createElement("figure");
    cartoonImgContainer.id = id;
    const svgNode = createSvgNode();
    const cartoonSvg = document.createElementNS(svgNS,'image');
    cartoonSvg.setAttribute('width', '100%');
    cartoonSvg.setAttribute('height', '100%');
    cartoonSvg.setAttribute('href', imagePath);
    svgNode.appendChild(cartoonSvg);
    for (let i = 0; i < svgTypes.length; i++) {
        if (svgTypes[i].type === 'ellipse') {
            let ellipseSvg = buildEllipseSvg(osd, svgNS, svgTypes[i], storyNum, waypointNum);
            svgNode.appendChild(ellipseSvg);
        }
        else if (svgTypes[i].type === 'path'){
            let pathSvg = buildPathSvg(osd, svgNS, svgTypes[i], storyNum, waypointNum);
            svgNode.appendChild(pathSvg);
        }
        else if (svgTypes[i].type === 'rect'){
            let rectSvg = buildRectSvg(osd, svgNS, svgTypes[i], storyNum, waypointNum);
            svgNode.appendChild(rectSvg)
        }
    }
    cartoonImgContainer.appendChild(svgNode);
    return cartoonImgContainer
}

export function addHintText(hintText, hintId, showdown_text) {
    const hintTextDiv = document.createElement('div');
    hintTextDiv.id = hintId
    hintTextDiv.innerHTML = showdown_text.makeHtml(hintText);
    document.querySelector('.minerva-mask-layers').appendChild(hintTextDiv);
}