/*!
 * Ladda
 * http://lab.hakim.se/ladda
 * MIT licensed
 *
 * Copyright (C) 2015 Hakim El Hattab, http://hakim.se
 */
/* jshint node:true, browser:true */
(function( root, factory ) {

	// CommonJS
	if( typeof exports === 'object' )  {
		module.exports = factory(require('./spin.js'));
	}
	// AMD module
	else if( typeof define === 'function' && define.amd ) {
		define( [ 'spin' ], factory );
	}
	// Browser global
	else {
		root.Ladda = factory( root.Spinner );
	}

}
(this, function( Spinner ) {
	'use strict';

	// All currently instantiated instances of Ladda
	var ALL_INSTANCES = [];

	/**
	 * Creates a new instance of Ladda which wraps the
	 * target button element.
	 *
	 * @return An API object that can be used to control
	 * the loading animation state.
	 */
	function create( button ) {

		if( typeof button === 'undefined' ) {
			console.warn( "Ladda button target must be defined." );
			return;
		}

		// The button must have the class "ladda-button"
		if( !/ladda-button/i.test( button.className ) ) {
			button.className += ' ladda-button';
		}

		// Style is required, default to "expand-right"
		if( !button.hasAttribute( 'data-style' ) ) {
			button.setAttribute( 'data-style', 'expand-right' );
		}

		// The text contents must be wrapped in a ladda-label
		// element, create one if it doesn't already exist
		if( !button.querySelector( '.ladda-label' ) ) {
			var laddaLabel = document.createElement( 'span' );
			laddaLabel.className = 'ladda-label';
			wrapContent( button, laddaLabel );
		}

		// The spinner component
		var spinner,
			spinnerWrapper = button.querySelector( '.ladda-spinner' );

		// Wrapper element for the spinner
		if( !spinnerWrapper ) {
			spinnerWrapper = document.createElement( 'span' );
			spinnerWrapper.className = 'ladda-spinner';
		}

		button.appendChild( spinnerWrapper );

		// Timer used to delay starting/stopping
		var timer;

		var instance = {

			/**
			 * Enter the loading state.
			 */
			start: function() {

				// Create the spinner if it doesn't already exist
				if( !spinner ) spinner = createSpinner( button );

				button.setAttribute( 'disabled', '' );
				button.setAttribute( 'data-loading', '' );

				clearTimeout( timer );
				spinner.spin( spinnerWrapper );

				this.setProgress( 0 );

				return this; // chain

			},

			/**
			 * Enter the loading state, after a delay.
			 */
			startAfter: function( delay ) {

				clearTimeout( timer );
				timer = setTimeout( function() { instance.start(); }, delay );

				return this; // chain

			},

			/**
			 * Exit the loading state.
			 */
			stop: function() {

				button.removeAttribute( 'disabled' );
				button.removeAttribute( 'data-loading' );

				// Kill the animation after a delay to make sure it
				// runs for the duration of the button transition
				clearTimeout( timer );

				if( spinner ) {
					timer = setTimeout( function() { spinner.stop(); }, 1000 );
				}

				return this; // chain

			},

			/**
			 * Toggle the loading state on/off.
			 */
			toggle: function() {

				if( this.isLoading() ) {
					this.stop();
				}
				else {
					this.start();
				}

				return this; // chain

			},

			/**
			 * Sets the width of the visual progress bar inside of
			 * this Ladda button
			 *
			 * @param {Number} progress in the range of 0-1
			 */
			setProgress: function( progress ) {

				// Cap it
				progress = Math.max( Math.min( progress, 1 ), 0 );

				var progressElement = button.querySelector( '.ladda-progress' );

				// Remove the progress bar if we're at 0 progress
				if( progress === 0 && progressElement && progressElement.parentNode ) {
					progressElement.parentNode.removeChild( progressElement );
				}
				else {
					if( !progressElement ) {
						progressElement = document.createElement( 'div' );
						progressElement.className = 'ladda-progress';
						button.appendChild( progressElement );
					}

					progressElement.style.width = ( ( progress || 0 ) * button.offsetWidth ) + 'px';
				}

			},

			enable: function() {

				this.stop();

				return this; // chain

			},

			disable: function () {

				this.stop();
				button.setAttribute( 'disabled', '' );

				return this; // chain

			},

			isLoading: function() {

				return button.hasAttribute( 'data-loading' );

			},

			remove: function() {

				clearTimeout( timer );

				button.removeAttribute( 'disabled', '' );
				button.removeAttribute( 'data-loading', '' );

				if( spinner ) {
					spinner.stop();
					spinner = null;
				}

				for( var i = 0, len = ALL_INSTANCES.length; i < len; i++ ) {
					if( instance === ALL_INSTANCES[i] ) {
						ALL_INSTANCES.splice( i, 1 );
						break;
					}
				}

			}

		};

		ALL_INSTANCES.push( instance );

		return instance;

	}

	/**
	* Get the first ancestor node from an element, having a
	* certain type.
	*
	* @param elem An HTML element
	* @param type an HTML tag type (uppercased)
	*
	* @return An HTML element
	*/
	function getAncestorOfTagType( elem, type ) {

		while ( elem.parentNode && elem.tagName !== type ) {
			elem = elem.parentNode;
		}

		return ( type === elem.tagName ) ? elem : undefined;

	}

	/**
	 * Returns a list of all inputs in the given form that
	 * have their `required` attribute set.
	 *
	 * @param form The from HTML element to look in
	 *
	 * @return A list of elements
	 */
	function getRequiredFields( form ) {

		var requirables = [ 'input', 'textarea', 'select' ];
		var inputs = [];

		for( var i = 0; i < requirables.length; i++ ) {
			var candidates = form.getElementsByTagName( requirables[i] );
			for( var j = 0; j < candidates.length; j++ ) {
				if ( candidates[j].hasAttribute( 'required' ) ) {
					inputs.push( candidates[j] );
				}
			}
		}

		return inputs;

	}


	/**
	 * Binds the target buttons to automatically enter the
	 * loading state when clicked.
	 *
	 * @param target Either an HTML element or a CSS selector.
	 * @param options
	 *          - timeout Number of milliseconds to wait before
	 *            automatically cancelling the animation.
	 */
	function bind( target, options ) {

		options = options || {};

		var targets = [];

		if( typeof target === 'string' ) {
			targets = toArray( document.querySelectorAll( target ) );
		}
		else if( typeof target === 'object' && typeof target.nodeName === 'string' ) {
			targets = [ target ];
		}

		for( var i = 0, len = targets.length; i < len; i++ ) {

			(function() {
				var element = targets[i];

				// Make sure we're working with a DOM element
				if( typeof element.addEventListener === 'function' ) {
					var instance = create( element );
					var timeout = -1;

					element.addEventListener( 'click', function( event ) {

						// If the button belongs to a form, make sure all the
						// fields in that form are filled out
						var valid = true;
						var form = getAncestorOfTagType( element, 'FORM' );

						if( typeof form !== 'undefined' ) {
							var requireds = getRequiredFields( form );
							for( var i = 0; i < requireds.length; i++ ) {

								// Alternatively to this trim() check,
								// we could have use .checkValidity() or .validity.valid
								if( requireds[i].value.replace( /^\s+|\s+$/g, '' ) === '' ) {
									valid = false;
								}

								// Radiobuttons and Checkboxes need to be checked for the "checked" attribute
								if( (requireds[i].type === 'checkbox' || requireds[i].type === 'radio' ) && !requireds[i].checked ) {
									valid = false;
								}

								// Email field validation, otherwise button starts spinning although field is not complete
								if( requireds[i].type === 'email' ) {
									valid = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test( requireds[i].value );
								}

							}
						}

						if( valid ) {
							// This is asynchronous to avoid an issue where setting
							// the disabled attribute on the button prevents forms
							// from submitting
							instance.startAfter( 1 );

							// Set a loading timeout if one is specified
							if( typeof options.timeout === 'number' ) {
								clearTimeout( timeout );
								timeout = setTimeout( instance.stop, options.timeout );
							}

							// Invoke callbacks
							if( typeof options.callback === 'function' ) {
								options.callback.apply( null, [ instance ] );
							}
						}

					}, false );
				}
			})();

		}

	}

	/**
	 * Stops ALL current loading animations.
	 */
	function stopAll() {

		for( var i = 0, len = ALL_INSTANCES.length; i < len; i++ ) {
			ALL_INSTANCES[i].stop();
		}

	}

	function createSpinner( button ) {

		var height = button.offsetHeight,
			spinnerColor,
			spinnerLines;

		if( height === 0 ) {
			// We may have an element that is not visible so
			// we attempt to get the height in a different way
			height = parseFloat( window.getComputedStyle( button ).height );
		}

		// If the button is tall we can afford some padding
		if( height > 32 ) {
			height *= 0.8;
		}

		// Prefer an explicit height if one is defined
		if( button.hasAttribute( 'data-spinner-size' ) ) {
			height = parseInt( button.getAttribute( 'data-spinner-size' ), 10 );
		}

		// Allow buttons to specify the color of the spinner element
		if( button.hasAttribute( 'data-spinner-color' ) ) {
			spinnerColor = button.getAttribute( 'data-spinner-color' );
		}

		// Allow buttons to specify the number of lines of the spinner
		if( button.hasAttribute( 'data-spinner-lines' ) ) {
			spinnerLines = parseInt( button.getAttribute( 'data-spinner-lines' ), 10 );
		}

		var radius = height * 0.2,
			length = radius * 0.6,
			width = radius < 7 ? 2 : 3;

		return new Spinner( {
			color: spinnerColor || '#fff',
			lines: spinnerLines || 12,
			radius: radius,
			length: length,
			width: width,
			zIndex: 'auto',
			top: 'auto',
			left: 'auto',
			className: ''
		} );

	}

	function toArray( nodes ) {

		var a = [];

		for ( var i = 0; i < nodes.length; i++ ) {
			a.push( nodes[ i ] );
		}

		return a;

	}

	function wrapContent( node, wrapper ) {

		var r = document.createRange();
		r.selectNodeContents( node );
		r.surroundContents( wrapper );
		node.appendChild( wrapper );

	}

	// Public API
	return {

		bind: bind,
		create: create,
		stopAll: stopAll

	};

}));
