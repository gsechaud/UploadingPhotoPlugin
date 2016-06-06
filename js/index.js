// --------------- jquery include ----------------------

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

include("https://ajax.googleapis.com/ajax/libs/jquery/1.12.2/jquery.min.js", function() {
    $(document).ready(function() {
    	initPhysicalComponents();
    });
});

// -------------- plugin execution ----------------

// fill the "windowPlugin" div and ""
function initPhysicalComponents() {
	$(".windowPlugin").append("<div class='fullBox'></div>")
					  .append("<div class='buttons'>");
		$(".fullBox").append("<form class='box' method='post' action='' enctype='multipart/form-data'></form>")
					 .append("<canvas class='imgCanvas'></canvas>");
			$(".box").append("<div class='box__input'></div>");
			$(".box__input").append("<input class='box__file' accept='image/*' type='file' id='file' onchange='uploadManually()'/>")
							.append("<label for='file'><strong>Choose a file</strong></label><span class='box__dragndrop'> or drag it here</span>.");
		$(".buttons").append('<button onclick="backToUploadArea()">Canc</button>')
					 .append('<button onclick="transformations.rotate(10)">&#8635</button>')
					 .append('<button onclick="transformations.rotate(-10)">&#8634</button>')
					 .append('<button onclick="transformations.translate(-10,0)">&#8592</button>')
					 .append('<button onclick="transformations.translate(0,-10)">&#8593</button>')
					 .append('<button onclick="transformations.translate(10,0)">&#8594</button>')
					 .append('<button onclick="transformations.translate(0,10)">&#8595</button>')
					 .append('<button onclick="transformations.scale(transformations.scaleFactor)">+</button>')
					 .append('<button onclick="transformations.scale(1/transformations.scaleFactor)">-</button>')
					 .append('<button onclick="transformations.flip(-1,1)">&#8596</button>')
					 .append('<button onclick="transformations.flip(1,-1)">&#8597</button>')
					 .append('<button onclick="generatePreview()">Prev</button>');

	initializeInstances();
}

function initializeInstances() {
	fr = new FileReader();
	$form = $('.box');
	canvas = $(".imgCanvas")[0];
	ctx = canvas.getContext("2d");

	implementFunctionalities();
}

var image = {
	object: new Image(),
	width: 0,
	height: 0,
	posWidth: 0,
	posHeight: 0
};

var transformations = {
	rotationAngle: 0,
	scaleGlobal: 1.0,
	scaleFactor: 1.05,
	translateWidth: 0.0,
	translateHeight: 0.0,
	flipHorizontal: 1,
	flipVertical: 1,
	resetTransformations: function() {
		this.rotationAngle = 0;

		this.scaleGlobal = 1.0;
		this.scaleFactor = 1.05;

		this.translateWidth = 0.0;
		this.translateHeight = 0.0;

		this.flipHorizontal = 1;
		this.flipVertical = 1;
	},
	rotate: function(angle) {
		transformations.rotationAngle += angle;
		transformations.rotationAngle %= 360;
		performAction();
	},
	scale: function(scaleValue) {
		transformations.scaleGlobal *= scaleValue;
		performAction();
	},
	translate: function(w_pixels, h_pixels) {
		transformations.translateWidth += w_pixels;
		transformations.translateHeight += h_pixels;				
		performAction();
	},
	flip: function(horizontal, vertical) {
		transformations.flipHorizontal *= horizontal;
		transformations.flipVertical *= vertical;
		performAction();
	}
};

var mouse = {
	width: 0,
	height: 0,
	isMoving: false
};

function clearCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function performAction() {
	clearCanvas();

	ctx.save();

	ctx.translate(image.posWidth + image.width/2, image.posHeight + image.height/2);
	ctx.translate(transformations.translateWidth, transformations.translateHeight);

	ctx.scale(transformations.scaleGlobal, transformations.scaleGlobal);
	
	ctx.rotate(transformations.rotationAngle*Math.PI/180);
	ctx.scale(transformations.flipHorizontal, transformations.flipVertical);

	ctx.drawImage(image.object, -image.width/2, -image.height/2, image.width, image.height);

	ctx.restore();
}

function uploadManually() {
	var file = document.querySelector('input[type=file]').files[0];
	enterImageMode(file);
}

function enterImageMode(image) {
	fr.readAsDataURL(image);
}

function generatePreview() {
	var finalImage = canvas.toDataURL();
	var $img = $(".imgPreview");
	$img.css("display", "block");
	$img.css("width", canvas.width/2);
	$img.css("height", canvas.height/2);
	$img.css("background-color", canvas.style.backgroundColor);
	$(".imgPreview").attr("src", finalImage);
}

function backToUploadArea() {
	$form.css("display", "inline-block");
	$(".buttons").css("display", "none");
	canvas.style.display = "none";
	transformations.resetTransformations();
}

function implementFunctionalities() {
	// initialize the image and place it in the good dimensions in the canvas
	fr.addEventListener("load", function() {
		$form.css("display", "none");
		$(".buttons").css("display", "block");
		canvas.style.display = "block";
		canvas.style.backgroundColor = "grey";

	    // fit the canvas to the parent div
	    canvas.style.width ='100%';
		canvas.style.height='100%';
		canvas.width  = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;

		// load the image fitted to the canvas window
		image.object.src = fr.result;
		image.object.onload = function() {
            var wrh = image.object.width / image.object.height;
            var newWidth = canvas.width;
            var newHeight = newWidth / wrh;
            if (newHeight > canvas.height) {
                newHeight = canvas.height;
                newWidth = newHeight * wrh;
        	}
        	image.width = newWidth;
        	image.height = newHeight;
        	image.posWidth = (canvas.width-newWidth)/2;
        	image.posHeight = (canvas.height-newHeight)/2;
            ctx.drawImage(image.object, image.posWidth, image.posHeight, image.width, image.height);
		};

		// move image if mouse event caught and current selected component is the canvas
		$(canvas).on('mousedown', function(e) {
			e.preventDefault();
			var canvOffset = $(canvas).offset();

			// allow to get direct correct position of drag, not (0,0) in the top left corner of the image
			mouse.width = e.clientX - canvOffset.left;
			mouse.height = e.clientY - canvOffset.top;

			// left click only for moving image inside canvas
			if(e.which == 1)
				mouse.isMoving = true;
		// zoom in/out depending on the scroll data
		}).on('mousewheel DOMMouseScroll', function(e) {
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
	        	transformations.scale(transformations.scaleFactor);
	        else
	        	transformations.scale(1/transformations.scaleFactor);
		});

		// update mouse position, and move image if in movable image mode
		$(window).on('mousemove', function(event) {
			var canvasOffset = $(canvas).offset();
			var diffW = (event.clientX - canvasOffset.left) - mouse.width;
			var diffH = (event.clientY - canvasOffset.top) - mouse.height;
			mouse.width = event.clientX - canvasOffset.left;
			mouse.height = event.clientY - canvasOffset.top;

			if(mouse.isMoving)
				transformations.translate(diffW, diffH);

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
		.on('drop', function(e) {
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