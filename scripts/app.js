
(function() {
  'use strict';

  var initialWeatherForecast = {
    key: 'newyork',
    label: 'New York, NY',
    currently: {
      time: 1466447731,
      summary: 'Clear',
      icon: 'clear-day',
      temperature: 81,
      apparentTemperature: 82,
      precipProbability: 0,
      humidity: 0.57,
      windBearing: 152,
      windSpeed: 7
    },
    daily: {
      data: [
        {icon: 'rain', temperatureMax: 81, temperatureMin: 63},
        {icon: 'rain', temperatureMax: 85, temperatureMin: 70},
        {icon: 'partly-cloudy-day', temperatureMax: 85, temperatureMin: 66},
        {icon: 'rain', temperatureMax: 77, temperatureMin: 67},
        {icon: 'clear', temperatureMax: 80, temperatureMin: 64},
        {icon: 'clear', temperatureMax: 82, temperatureMin: 66},
        {icon: 'partly-cloudy-day', temperatureMax: 79, temperatureMin: 66}
      ]
    }
  };

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function() {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function() {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }
    var cardLastUpdated = parseInt(card.querySelector('.raw-date').textContent);
    if (cardLastUpdated >= data.currently.time) {
      console.log('Skipping, new data is older than what is on screen.');
      return;
    }
    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.raw-date').textContent = data.currently.time;
    card.querySelector('.date').textContent =
      new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent =
      Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temperatureMin);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  app.getForecast = function(key, label) {
    var url = 'http://localhost:9800/';
    url += key + '.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            json.key = key;
            json.label = label;
            app.updateForecastCard(json);
          });
        }
      });
    }
    // Make the XHR to get the data, then update the card
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.updateForecastCard(response);
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // Save list of cities to localStorage.
  app.saveSelectedCities = function() {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function(city) {
      app.getForecast(city.key, city.label);
    });
  } else {
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
    ];
    app.saveSelectedCities();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('/service-worker.js')
             .then(function(reg) { 
                console.log('Service Worker Registered', reg); 
              });
  }

})();
