(function () {
    "use strict";
    if (!window.hasOwnProperty("visionEditor")) {
        window.visionEditor = [];
        window.visionEditor.new = function (domContainer, options = {}) {
            if ((domContainer instanceof Element) == false) {
                console.warn("Can't create a vision editor : Invalid DOM element.\n", domContainer);
                throw "Invalid DOM element.";
            }

            let infoSection = domContainer.querySelector('[vision-editor-type="info-overlay"]');

            let actionSection = domContainer.querySelector('[vision-editor-type="actions-overlay"]');

            let modalSection = domContainer.querySelector('[vision-editor-type="modal-overview"]');

            let mouseAnnotationSection = domContainer.querySelector('[vision-editor-type="mouse-annotation"]');

            domContainer = domContainer.querySelector('[vision-editor-type="view"]');

            actionSection.querySelector(".lock").onclick = function () {
                domContainer.viewLocked = !domContainer.viewLocked;

                if (domContainer.viewLocked) {
                    domContainer.style = "cursor:crosshair;";

                    domContainer.onmousemove = function (e) {
                        const [r, g, b, a] = document.querySelector("canvas").getContext("2d").getImageData(e.layerX, e.layerY, 1, 1).data;
                        mouseAnnotationSection.style = `transform:translate(${e.layerX}px, ${e.layerY}px);`;

                        mouseAnnotationSection.children[0].innerHTML = `(${e.layerX}, ${e.layerY})`;
                        mouseAnnotationSection.children[1].innerHTML = `[${r}, ${g}, ${b}]`;
                    };

                    domContainer.onmouseenter = function () {
                        mouseAnnotationSection.style = "";
                    }

                    domContainer.onmouseleave = function () {
                        mouseAnnotationSection.style = "display:none;";
                    }

                } else {
                    domContainer.style = "cursor:grab;";
                    mouseAnnotationSection.style = "display:none;";
                    domContainer.onmousemove = null;
                    domContainer.onmouseenter = null;
                    domContainer.onmouseleave = null;
                }
            }

            /*
            sample
            document.querySelector(".information").initializeModal = (e) => e.innerHTML = `<div id="mySuperId" tabindex="-1" role="dialog"><div class="modal-dialog" role="document"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">ℹ️ Information</h5></div><div class="modal-body"><p>J'ai des informations a afficher par ici.</p></div></div></div></div>`;
            document.querySelector(".information").onModal = function(e) { }

            //*/

            actionSection.querySelector(".information").onclick = function () {
                var buttonContext = actionSection.querySelector(".information");

                if (typeof buttonContext.initializeModal === "function")
                    buttonContext.initializeModal(modalSection);

                modalSection.style = "";

                if (typeof buttonContext.onModal === "function")
                    buttonContext.onModal();
            }

            modalSection.onclick = function () {
                modalSection.style = "display:none";
            }


            if (window.visionEditor.includes(domContainer)) {
                console.warn("Vision editor context already created aroud this DOM.\n", domContainer);
                throw "Invalid DOM element.";
            }

            if (domContainer.innerHTML != "") {
                console.warn("The given vision editor DOM context has already something into it.\nThis command will remove what's inside of it.");
            }

            domContainer.onmousedown = function () {
                if (domContainer.viewLocked)
                    return;
                domContainer.style = "cursor:grabbing;";
            }

            domContainer.onmouseup = function () {
                if (domContainer.viewLocked)
                    return;
                domContainer.style = "cursor:grab;";
            }

            const resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0];

                domContainer._stage.setX((entry.contentRect.width - domContainer._stage.width()) / 2 + domContainer._stage.x());
                domContainer._stage.setY((entry.contentRect.height - domContainer._stage.height()) / 2 + domContainer._stage.y());

                domContainer._stage.size({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });

                if (domContainer._stage.adaptedToViewer) {
                    adaptVideoSizeToViewer();
                }
                syncVideoTransform();
            });


            var visionEditorIndex = window.visionEditor.length;
            Object.assign(domContainer, {
                editorIndex: visionEditorIndex,
                editable: options.hasOwnProperty("editable") ? options.editable == true : false,
                interractive: options.hasOwnProperty("interractive") ? options.interractive == true : true,
                rawVideoStream: options.hasOwnProperty("rawVideoStream") ? options.rawVideoStream : [],
                shapes: [],

                // konva stage
                _stage: null,

                addShape: function (shape) {
                    var createLine = function () {
                        const line = new Konva.Line({
                            points: [500, 100, 650, 200],
                            stroke: "blue",
                            strokeWidth: 1,
                            draggable: false,
                            name: "line",
                            strokeScaleEnabled: false,
                            hitStrokeWidth: 10,
                        });

                        layer.add(line);

                        // 🔧 Fix pour ligne (mettre à jour points si besoin)
                        line.on("transformend", () => {
                            const scaleX = line.scaleX();
                            const scaleY = line.scaleY();

                            const points = line.points();

                            for (let i = 0; i < points.length; i += 2) {
                                points[i] *= scaleX;
                                points[i + 1] *= scaleY;
                            }

                            line.points(points);
                            line.scaleX(1);
                            line.scaleY(1);
                        });

                        const startHandle = new Konva.Rect({
                            x: -5,
                            y: -5,
                            width: 10,
                            height: 10,
                            fill: "white",
                            stroke: "blue",
                            strokeWidth: 1,
                            draggable: true,
                            name: "rect",
                            strokeScaleEnabled: false,
                        });

                        const endHandle = new Konva.Rect({
                            x: -5,
                            y: -5,
                            width: 10,
                            height: 10,
                            fill: "white",
                            stroke: "blue",
                            strokeWidth: 1,
                            draggable: true,
                            name: "rect",
                            strokeScaleEnabled: false,
                        });

                        startHandle.on("dragmove", updateLine);
                        endHandle.on("dragmove", updateLine);

                        function updateLine() {
                            line.points([
                                startHandle.x() + 5,
                                startHandle.y() + 5,
                                endHandle.x() + 5,
                                endHandle.y() + 5,
                            ]);
                            layer.batchDraw();
                        }

                        function updateHandles() {
                            const pts = line.points();
                            startHandle.position({ x: pts[0] - 5, y: pts[1] - 5 });
                            endHandle.position({ x: pts[2] - 5, y: pts[3] - 5 });
                        }

                        layer.add(startHandle, endHandle);

                        layer.draw();
                    }
                    var createRectangle = function () {
                        const rect = new Konva.Rect({
                            x: 300,
                            y: 100,
                            width: 150,
                            height: 100,
                            stroke: "blue",
                            strokeWidth: 1,
                            draggable: true,
                            name: "rect",
                            strokeScaleEnabled: false,
                        });
                        layer.add(rect);
                    }
                    var createCircle = function () {
                        const circle = new Konva.Circle({
                            x: 150,
                            y: 150,
                            radius: 50,
                            stroke: "blue",
                            strokeWidth: 1,
                            draggable: true,
                            name: "circle",
                            strokeScaleEnabled: false,
                        });
                        layer.add(circle);
                    }

                    // circle
                    if (shape == "circle") {
                        createCircle();
                        return;
                    }

                    // rectangle
                    if (shape == "rectangle") {
                        createRectangle();
                        return;
                    }

                    // line
                    if (shape == "line") {
                        createLine();
                        return;
                    }

                    // arrow
                    // polygon
                },
            });

            /// INITIALISATION

            domContainer.videoStream = [];
            domContainer.innerHTML = "";
            domContainer.style = "cursor:grab;";
            domContainer.viewLocked = false;
            infoSection.innerHTML = "";
            var index = 0;
            for (var vSource of domContainer.rawVideoStream) {
                const videoViewer = document.createElement("img");
                const videoViewerId = domContainer.editorIndex + "-" + index;
                videoViewer.id = 'videoViewer-' + videoViewerId;
                videoViewer.src = vSource;
                videoViewer.style = "image-rendering: pixelated;position:absolute;top:0;left:0;transform-origin: top left;";
                videoViewer.frameCount = 0;

                infoSection.innerHTML +=
                    `<div id="videoViewer-info-${videoViewerId}">
                        <div class="camera-name"></div>
                        <div class="image-count">0</div>
                        <div class="fps">0</div>
                    </div>`;

                let infoSectionDom = document.getElementById(`videoViewer-info-${videoViewerId}`);
                infoSectionDom.querySelector('.camera-name').innerHTML = `cam[${index}]`;

                videoViewer.associatedInfo = {
                    'dom': infoSectionDom,
                    'cameraNameDom': infoSectionDom.querySelector('.camera-name'),
                    'imageCountDom': infoSectionDom.querySelector('.image-count'),
                    'fpsDom': infoSectionDom.querySelector('.fps')
                };

                videoViewer.lastFrame = performance.now();

                videoViewer.addEventListener('load', onFirstFrame, {
                    once: true
                });

                videoViewer.addEventListener('load', () => onFrame(videoViewer));

                domContainer.videoStream.push(videoViewer);

                domContainer.appendChild(videoViewer);
                index++;
            }

            const konvaOverlay = document.createElement("div");
            konvaOverlay.id = "overlayContainer-" + domContainer.editorIndex;
            konvaOverlay.style = "position:absolute;top:0;left:0;";
            domContainer.appendChild(konvaOverlay);


            domContainer._stage = new Konva.Stage({
                container: konvaOverlay.id,
                width: domContainer.clientWidth,
                height: domContainer.clientHeight,
                draggable: true,
            });
            domContainer._stage.adaptedToViewer = true;

            const layer = new Konva.Layer();
            domContainer._stage.add(layer);

            const tr = new Konva.Transformer();
            layer.add(tr);

            domContainer._stage.on("click", (e) => {
                if (e.target === domContainer._stage) {
                    tr.nodes([]);
                    layer.draw();
                    return;
                }

                const node = e.target;

                if (node.name() === "rect") {
                    tr.nodes([node]);
                    tr.keepRatio(false);
                    tr.rotateEnabled(true);
                    tr.enabledAnchors([
                        "top-left", "top-right",
                        "bottom-left", "bottom-right",
                        "middle-left", "middle-right",
                        "top-center", "bottom-center"
                    ]);
                }
                else if (node.name() === "circle") {
                    tr.nodes([node]);
                    tr.rotateEnabled(false);
                    tr.keepRatio(true);

                    // uniquement coins → scale uniforme
                    tr.enabledAnchors([
                        "top-left", "top-right",
                        "bottom-left", "bottom-right"
                    ]);
                }
                else if (node.name() === "line") {
                    tr.nodes([]); // ❌ pas de transformer

                    updateHandles();
                }

                layer.draw();
            });

            // 🔥 Fonction clé : sync transform
            function syncVideoTransform() {
                const scaleX = domContainer._stage.scaleX();
                const scaleY = domContainer._stage.scaleY();
                const x = domContainer._stage.x();
                const y = domContainer._stage.y();

                var index = 0;
                for (var vSource of domContainer.rawVideoStream) {
                    var vidDOM = document.getElementById('videoViewer-' + domContainer.editorIndex + "-" + index);

                    vidDOM.style.transform = `
                translate(${x}px, ${y}px)
                scale(${scaleX}, ${scaleY})`;
                }
            }

            function adaptVideoSizeToViewer() {
                var videoWidthMax = Math.max(...domContainer.videoStream.map(p => p.width));
                var videoHeightMax = Math.max(...domContainer.videoStream.map(p => p.height));

                var viewerWidth = domContainer._stage.width();
                var viewerHeight = domContainer._stage.height();


                // ratio de scale pour rentrer dans le viewer
                var scale = Math.min(
                    viewerWidth / videoWidthMax,
                    viewerHeight / videoHeightMax
                );


                // taille finale affichée
                var scaledWidth = videoWidthMax * scale;
                var scaledHeight = videoHeightMax * scale;


                // centrage
                var posX = (viewerWidth - scaledWidth) / 2;
                var posY = (viewerHeight - scaledHeight) / 2;


                // application
                domContainer._stage.scale({
                    x: scale,
                    y: scale
                });

                domContainer._stage.position({
                    x: posX,
                    y: posY
                });
            }

            function onFirstFrame() {
                adaptVideoSizeToViewer();
                syncVideoTransform();
            }

            function onFrame(videoViewer) {
                videoViewer.frameCount++;
                videoViewer.associatedInfo.imageCountDom.innerHTML = videoViewer.frameCount;

                const now = performance.now();

                const fps = 1000 / (now - videoViewer.lastFrame);

                videoViewer.lastFrame = now;

                videoViewer.associatedInfo.fpsDom.innerHTML = Number.isFinite(fps) ? fps.toFixed(2) : "-";
            }

            // 🖱️ Zoom
            domContainer._stage.on("wheel", function (e) {
                if (domContainer.viewLocked)
                    return;
                e.evt.preventDefault();

                const scaleBy = 1.05;
                const oldScale = domContainer._stage.scaleX();

                const pointer = domContainer._stage.getPointerPosition();

                const mousePointTo = {
                    x: (pointer.x - domContainer._stage.x()) / oldScale,
                    y: (pointer.y - domContainer._stage.y()) / oldScale,
                };

                const newScale = e.evt.deltaY > 0
                    ? oldScale / scaleBy
                    : oldScale * scaleBy;

                domContainer._stage.scale({ x: newScale, y: newScale });

                const newPos = {
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                };

                domContainer._stage.position(newPos);
                domContainer._stage.batchDraw();

                domContainer._stage.adaptedToViewer = false;

                syncVideoTransform();
            });

            // 🖐️ Pan
            domContainer._stage.on("dragmove", () => {
                if (domContainer.viewLocked)
                    return;

                domContainer._stage.adaptedToViewer = false;
                syncVideoTransform();
            });

            domContainer._stage.on("dblclick", (e) => {
                if (domContainer.viewLocked)
                    return;

                adaptVideoSizeToViewer();
                domContainer._stage.adaptedToViewer = true;
                syncVideoTransform();
            });

            resizeObserver.observe(domContainer);

            // init
            syncVideoTransform();

            window.visionEditor[visionEditorIndex] = domContainer;
        }
    }
})();