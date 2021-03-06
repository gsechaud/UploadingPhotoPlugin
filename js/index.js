// --------------- jquery include ----------------------
// 	TODO ; there could be exist an easier way to include those js files inside an other, but didn't found an other simpler way

// include function for js source
function include(filename, onload) {
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.src = filename;
    script.type = 'text/javascript';
    script.onload = script.onreadystatechange = function() {
        if (script.readyState) {
            if (script.readyState === 'complete' || script.readyState === 'loaded') {
                script.onreadystatechange = null;                                                  
                onload();
            }
        } 
        else {
            onload();          
        }
    };
    head.appendChild(script);
}

importJQuery();

// import JQuery library
function importJQuery() {
	include("http://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js", function() {
	    $(document).ready(function() {
	    	importJQueryUI();
	    });
	});
}

// import JQuery UI library, mostly (only) used for the crop area
function importJQueryUI() {
	$.getScript("http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.js", function() {
		initPhysicalComponents();
	});
}

// -------------- plugin execution ----------------
// 
// --- hierarchy ---
// 					div ("windowPlugin")
// 				     /				\
// 			  div ("fullBox")	div ("buttons")
// 	
// 	where "fullBox" contains a form for the uploading functionality of the plugin
// 						 and a canvas for the manipulation functionality of the image
// 						    (a div "cropArea" allowing to display or not the crop rectangle when enabled on the manipulation view)
// 		each displaying or not depending on state of the execution of the plugin.

// fill the "windowPlugin" class div
function initPhysicalComponents() {
	$(".windowPlugin").append("<div class='fullBox'></div>")
					  .append("<div class='buttons'>");
		$(".fullBox").append("<form class='box' method='post' action='' enctype='multipart/form-data'></form>")
					 .append("<canvas class='imgCanvas'></canvas>")
					 .append("<div id='cropArea' style='display:none;position:absolute;width:50%;height:50%;left:25%;top:25%;opacity:0.3;background-color:white;border:1px dotted grey;z-index:1'></div>");
			$(".box").append("<input class='box__file' accept='image/*' type='file' id='file' onchange='uploadManually()'/>")
							.append("<label for='file'><strong>Choose a file</strong></label><span class='box__dragndrop'> or drag it here</span>.");
		$(".buttons").append('<button onclick="backToUploadArea()">Canc</button>')
					 .append('<button onclick="canvasBox.transformations.rotate(10)">&#8635</button>')
					 .append('<button onclick="canvasBox.transformations.rotate(-10)">&#8634</button>')
					 .append('<button onclick="canvasBox.transformations.translate(-10,0)">&#8592</button>')
					 .append('<button onclick="canvasBox.transformations.translate(0,-10)">&#8593</button>')
					 .append('<button onclick="canvasBox.transformations.translate(10,0)">&#8594</button>')
					 .append('<button onclick="canvasBox.transformations.translate(0,10)">&#8595</button>')
					 .append('<button onclick="canvasBox.transformations.scale(transformations.scaleFactor)">+</button>')
					 .append('<button onclick="canvasBox.transformations.scale(1/transformations.scaleFactor)">-</button>')
					 .append('<button onclick="canvasBox.transformations.flip(-1,1)">&#8596</button>')
					 .append('<button onclick="canvasBox.transformations.flip(1,-1)">&#8597</button>')
					 .append('<button onclick="generatePreview()">Prev</button>')
					 .append('<button onclick="cropMode()">Crop</button>')

	initializeInstances();
}

function initializeInstances() {
	fr = new FileReader();
	$form = $('.box');

	canvasBox = new Canvas($(".imgCanvas")[0]);
	canvasBox.updateBackground("dddddd"); // background-color of the canvas, may be more customizable for more possibility for the user (e.g. colorPicker)

	$cropArea = $("#cropArea");

	// used for the preview and set the dimension to a "fictive" canvas used to store the image obtained from the manipulation view
	canvasPreview = new Canvas(document.createElement("canvas"));

	implementFunctionalities();
}

function Canvas(canvas) {
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");

	// all transformations configurations and functions for the canvas (manipulation view)
	this.transformations = {
		rotationAngle: 0,
		scaleGlobal: 1.0,
		scaleFactor: 1.05,
		translateWidth: 0.0,
		translateHeight: 0.0,
		flipHorizontal: 1,
		flipVertical: 1,
		clear: function() {
			this.rotationAngle = 0;

			this.scaleGlobal = 1.0;
			this.scaleFactor = 1.05;

			this.translateWidth = 0.0;
			this.translateHeight = 0.0;

			this.flipHorizontal = 1;
			this.flipVertical = 1;
		},
		rotate: function(angle) {
			this.rotationAngle += angle;
			this.rotationAngle %= 360;
			performAction();
		},
		scale: function(scaleValue) {
			this.scaleGlobal *= scaleValue;
			performAction();
		},
		translate: function(w_pixels, h_pixels) {
			this.translateWidth += w_pixels;
			this.translateHeight += h_pixels;				
			performAction();
		},
		flip: function(horizontal, vertical) {
			this.flipHorizontal *= horizontal;
			this.flipVertical *= vertical;
			performAction();
		}
	}
	this.updateBackground = function(color) {
		this.canvas.style.backgroundColor = '#' + color;
	},
	this.clear = function() {
		this.ctx.clearRect(0, 0, canvasBox.canvas.width, canvasBox.canvas.height);
	}
}

var image = {
	object: new Image(),
	width: 0,
	height: 0,
	posWidth: 0,
	posHeight: 0
};

var mouse = {
	width: 0,
	height: 0,
	isMoving: false
};

function implementFunctionalities() {
	// initialize the image and place it in the good dimensions in the canvas
	fr.addEventListener("load", function() {
		$form.css("display", "none");
		$(".buttons").css("display", "block");
		canvasBox.canvas.style.display = "block";

	    // fit the canvas to the parent div
	    canvasBox.canvas.style.width ='100%';
		canvasBox.canvas.style.height='100%';
		canvasBox.canvas.width  = canvasBox.canvas.offsetWidth;
		canvasBox.canvas.height = canvasBox.canvas.offsetHeight;

		// load the image fitted to the canvas window
		image.object.src = fr.result;
		image.object.onload = function() {
            var wrh = image.object.width / image.object.height;
            var newWidth = canvasBox.canvas.width;
            var newHeight = newWidth / wrh;
            if (newHeight > canvasBox.canvas.height) {
                newHeight = canvasBox.canvas.height;
                newWidth = newHeight * wrh;
        	}
        	image.width = newWidth;
        	image.height = newHeight;
        	image.posWidth = (canvasBox.canvas.width-newWidth)/2;
        	image.posHeight = (canvasBox.canvas.height-newHeight)/2;
            canvasBox.ctx.drawImage(image.object, image.posWidth, image.posHeight, image.width, image.height);
		};

		// move image if mouse event caught and current selected component is the canvas
		$(canvasBox.canvas).on('mousedown', function(e) {
			e.preventDefault();
			var canvOffset = $(canvasBox.canvas).offset();

			// allow to get direct correct position of drag, not (0,0) in the top left corner of the image
			mouse.width = e.clientX - canvOffset.left;
			mouse.height = e.clientY - canvOffset.top;

			// left click only for moving image inside canvas
			if(e.which == 1)
				mouse.isMoving = true;
		// zoom in/out depending on the scroll data
		}).on('mousewheel DOMMouseScroll', function(e) {
			scrollMouse(e);
		});

		// same behaviour at scroll on crop area
		$cropArea.on('mousewheel DOMMouseScroll', function(e) {
			scrollMouse(e);
		});

		// update mouse position, and move image if in movable image mode
		$(window).on('mousemove', function(event) {
			var canvasOffset = $(canvasBox.canvas).offset();
			var diffW = (event.clientX - canvasOffset.left) - mouse.width;
			var diffH = (event.clientY - canvasOffset.top) - mouse.height;
			mouse.width = event.clientX - canvasOffset.left;
			mouse.height = event.clientY - canvasOffset.top;

			if(mouse.isMoving)
				canvasBox.transformations.translate(diffW, diffH);

		}).on("mouseup", function(event) {
			mouse.isMoving = false;
		});

	}, false);

	// drag and drop upload functionality
	if (isAdvancedUpload) {
		$form.addClass('has-advanced-upload');

		var droppedFiles = false;

		$form.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
			e.preventDefault();
			e.stopPropagation();
		})
		.on('dragover dragenter', function() {
			$form.addClass('is-dragover');
		})
		.on('dragleave dragend drop', function() {
			$form.removeClass('is-dragover');
		})
		.on('drop', function(e) { // drag and drop upload functionality
			droppedFiles = e.originalEvent.dataTransfer.files;
			if(droppedFiles[0].type.split("/")[0] == "image")
				enterImageMode(droppedFiles[0]);
			else
				alert("the file uploaded is not an image");
		});
	}
}

// verify that the draggable functionality is supported by the current configuration of the user
function isAdvancedUpload() {
	var div = document.createElement('div');
	return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}

// functionality of the crop mode in which, options can be modified (for example aspectRatio)
function cropMode() {
	$cropArea.css("display") == "none" ? $cropArea.css("display", "block") : $cropArea.css("display", "none")
	$cropArea.draggable({containment:"parent"})
			 .resizable({
			 	start: function(event, ui) { // set max size at resize functionality of the crop area
			 		$cropArea.css("max-height", $cropArea.parent().height() - $cropArea.position().top);
			 		$cropArea.css("max-width", $cropArea.parent().width() - $cropArea.position().left);
			 	},
			 	aspectRatio:true
			 });
}

// at each action (rotation, translation, zoom, etc...) we clear the canvas and reapply all the transformations
// save() and restore() because we just want the transformations between each frame, but not keep the modified space (problem for example if we want to initialize)
function performAction() {
	canvasBox.clear();

	canvasBox.ctx.save();

	canvasBox.ctx.translate(image.posWidth + image.width/2, image.posHeight + image.height/2);
	canvasBox.ctx.translate(canvasBox.transformations.translateWidth, canvasBox.transformations.translateHeight);

	canvasBox.ctx.scale(canvasBox.transformations.scaleGlobal, canvasBox.transformations.scaleGlobal);
	
	canvasBox.ctx.rotate(canvasBox.transformations.rotationAngle*Math.PI/180);
	canvasBox.ctx.scale(canvasBox.transformations.flipHorizontal, canvasBox.transformations.flipVertical);

	canvasBox.ctx.drawImage(image.object, -image.width/2, -image.height/2, image.width, image.height);

	canvasBox.ctx.restore();
}

// upload mode when file is selected manually (not by drag-and-drop)
function uploadManually() {
	var file = document.querySelector('input[type=file]').files[0];
	enterImageMode(file);
}

// we treat the image (get from manual upload or drag-and-drop upload)
function enterImageMode(image) {
	// "load" listener in implementFunctionalities()
	fr.readAsDataURL(image);
}

// get the image data from the canvas and specifically from the crop area if enabled
function generatePreview() {
	var imageData;
	var finalImage;

	// if crop functionality is enabled
	if($cropArea.css("display") == "block") {
		// first get image data from the canvas according to the crop area position
		imageData = canvasBox.ctx.getImageData($cropArea.position().left, $cropArea.position().top, $cropArea.width(), $cropArea.height());
		canvasPreview.canvas.width = $cropArea.width();
		canvasPreview.canvas.height = $cropArea.height();

		// store the data in the new canvas
		canvasPreview.ctx.putImageData(imageData, 0, 0);

		// get the base64 format image from the previous created canvas containing the image displayed in the crop area
		finalImage = canvasPreview.canvas.toDataURL();
	} else { // else, we get the entire canvas
		canvasPreview.canvas.width = canvasBox.canvas.width/2;
		canvasPreview.canvas.height = canvasBox.canvas.height/2;
		finalImage = canvasBox.canvas.toDataURL();
	}

	// set the preview image
	var $img = $(".imgPreview");
	$img.css("display", "block");
	$img.css("width", canvasPreview.canvas.width);
	$img.css("height", canvasPreview.canvas.height);
	$img.css("background-color", canvasBox.canvas.style.backgroundColor);

	// "finalImage" contains the final src value of the modified image --> use it in the getPaylod of the plugin
	$(".imgPreview").attr("src", finalImage);
}

// at manipulation view (canvas view), if we press the button "canc" (cancel), we go back to the initial view (upload view) in which we can reselect an image
function backToUploadArea() {
	canvasBox.transformations.clear();
	$cropArea.css("display", "none");
	$form.css("display", "inline-block");
	$(".buttons").css("display", "none");
	canvas.style.display = "none";
}

// wheel event, in which we rescale the image depending on the wheel orientation
function scrollMouse(e) {
	e.preventDefault();

	// for IE
	if(!e)
		e = window.event;

	var delta = 0;
	if (e.originalEvent.wheelDelta) /* IE/Opera. */
        delta = e.originalEvent.wheelDelta/120;
    else if (e.originalEvent.detail) /* Mozilla case. */
        delta = -e.originalEvent.detail/3;

    if(delta >= 0)
    	canvasBox.transformations.scale(canvasBox.transformations.scaleFactor);
    else
    	canvasBox.transformations.scale(1/canvasBox.transformations.scaleFactor);
}