import { index_regex } from './state'

// Event Listener to pan and zoom to a specific place.
export function panZoom(osd, svgObj, storyNum, waypointNum) {
    const id = 'ROIBox'
    // Pan and Zoom to the 'Best in Class' ROI
    osd.viewer.viewport.panTo(svgObj.panCoord)
    osd.viewer.viewport.zoomTo(svgObj.zoomRatio)
    //If a 'Best in Class ROI' is already highlighted, remove it and add a box around the new one
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

export function addMask(osd, maskNames) {
    osd.hashstate.m = [-1];
    maskNames.forEach((el) => {
        var escaped_name = el.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexName = RegExp('^'+escaped_name+'$','gi');
        const maskIndex = index_regex(osd.hashstate.masks, regexName);
        if (maskIndex >= 0){
            osd.hashstate.m.push(maskIndex);
        }
    });
    osd.hashstate.pushState();
    window.onpopstate();
}

export function addChannel(osd, channelName) {
    const channelsList = osd.hashstate.cgs[0].Channels;
    const channelIndex = channelsList.indexOf(channelName);
    if (channelIndex >= 0) {
        osd.hashstate.g = channelIndex + 1;
    } else {
        osd.hashstate.g = 0;
    }
}

export function addMaskAndChannel(osd, maskNames, channelName) {
    addMask(osd, maskNames);
    if (channelName){
        addChannel(osd, channelName);
    }
    osd.hashstate.pushState();
    window.onpopstate();
}

// Add Event Listeners to SVG elements based on attributes in their SVG object
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
                    addMask(osd, svgObj.maskName);
                    break;
                case 'addMaskAndChannel':
                    addMaskAndChannel(osd, svgObj.maskName, svgObj.channel);
                    break;
                default:
                    break;
            }
        })
    });   
}
