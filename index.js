/**
 * Select 2 jQuery plugin https://github.com/select2/select2
 *
 * N.B. the CSS for this module must be loaded separately.
 * TODO use webpack css-loader for loading css instead
 */

import 'select2'

/**
 * Select2 custom data adapter for retrieving predictions from Google Places.
 *
 * This adapter is inspired by https://github.com/select2/select2/blob/563198a4a2e0eb9f7adbc4775d360db1037a13db/src/js/select2/data/ajax.js
 *
 * N.B. - Google Places API Library should be loaded before using this adapter.
 */

$.fn.select2.amd.define('select2/data/PlacesAdapter', [
  'select2/data/array',
  'select2/data/maximumSelectionLength',
  'select2/data/minimumInputLength',
  'select2/utils'
], function(ArrayAdapter, MaximumSelectionLength, MinimumInputLength, Utils) {
  function PlacesAdapter($element, options) {
    if (!window.google && !window.google.maps && !window.google.maps.places) {
      throw new Error('Googple Places API not found');
    }

    // Google Maps AutocompleteService, see https://developers.google.com/maps/documentation/javascript/reference#AutocompleteService
    this.autocompleteService = new window.google.maps.places.AutocompleteService();
    this.placesOptions = this._applyDefaults(options.get('places'));

    if (this.placesOptions.processResults) {
      this.processResults = this.placesOptions.processResults;
    }

    PlacesAdapter.__super__.constructor.call(this, $element, options);
  }

  Utils.Extend(PlacesAdapter, ArrayAdapter);

  PlacesAdapter.prototype._applyDefaults = function(options) {
    var defaults = {
      types: ['(regions)'],

      // Bias results towards mainland USA (no Alaska, Hawaii, etc.)
      //  so we don't also get too many Mexico and Canada results
      bounds: new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(24, -125),
        new window.google.maps.LatLng(49.5, -66.5)
      )
    };

    return $.extend({}, defaults, options, true);
  };

  PlacesAdapter.prototype.processResults = function(results) {
    // set text for dropdown display
    return {
      results: results.map(function(place) {
        place.text = place.description
        return place;
      })
    }
  }

  PlacesAdapter.prototype.query = function(params, callback) {
    var self = this;

    var options = $.extend({
      input: params.term
    }, this.placesOptions);

    function request() {
      self.autocompleteService.getPlacePredictions(options, function(predictions, status) {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          self.trigger('results:message', {
            message: 'errorLoading'
          });

          return;
        }

        var results = self.processResults(predictions);

        if (!results || !results.results || !$.isArray(results.results)) {
          console.error('Select2: The Places results did not return an array in the ' +
              '`results` key of the response.');
        }

        callback(results);
      });
    }

    if (params.term) {
      if (this.placesOptions.delay) {
        if (this._queryTimeout) {
          window.clearTimeout(this._queryTimeout);
        }

        this._queryTimeout = window.setTimeout(request, this.placesOptions.delay);
      } else {
        request();
      }
    } else {
      // clear any delayed requests
      if (this._queryTimeout) {
        window.clearTimeout(this._queryTimeout);
      }
      // clear results
      callback({ results: [] });
    }
  };

  return Utils.Decorate(
    Utils.Decorate(PlacesAdapter, MinimumInputLength),
    MaximumSelectionLength);
});
