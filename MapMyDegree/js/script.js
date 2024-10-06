// Global variables
let map;
let markers = [];
let stateCities = {};
let majorTitles = new Set();
let openInfoWindow = null;
let userPosition = null; // To store the user's actual location
let favorites = []; // To store favorite schools
let placesService;
// Conversion table for SAT to ACT scores
const satToActConversionTable = {
    '590-615': 9,
    '616-645': 10,
    '646-685': 11,
    '686-725': 12,
    '726-775': 13,
    '776-825': 14,
    '826-875': 15,
    '876-915': 16,
    '916-955': 17,
    '956-985': 18,
    '986-1015': 19,
    '1016-1055': 20,
    '1056-1095': 21,
    '1096-1125': 22,
    '1126-1155': 23,
    '1156-1195': 24,
    '1196-1225': 25,
    '1226-1255': 26,
    '1256-1295': 27,
    '1296-1325': 28,
    '1326-1355': 29,
    '1356-1385': 30,
    '1386-1415': 31,
    '1416-1445': 32,
    '1446-1485': 33,
    '1486-1525': 34,
    '1526-1565': 35,
    '1566-1600': 36
    // Add more entries as needed
};

// Initialize the map
async function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 }, // Center of the US
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false, // Disable Street View control
        mapTypeControl: true, // Enable map type control
        styles: [ // Add custom map styles if desired
            {
                "featureType": "administrative",
                "elementType": "labels.text.fill",
                "stylers": [
                    { "color": "#444444" }
                ]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [
                    { "color": "#f2f2f2" }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [
                    { "visibility": "off" }
                ]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [
                    { "saturation": -100 },
                    { "lightness": 45 }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [
                    { "visibility": "simplified" }
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.icon",
                "stylers": [
                    { "visibility": "off" }
                ]
            },
            {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [
                    { "visibility": "off" }
                ]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [
                    { "color": "#b4d4e1" },
                    { "visibility": "on" }
                ]
            }
        ]
    });

    // Fetch the JSON data from last.json
    fetch('data/last.json') // Adjust the path if last.json is located elsewhere
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            processMapData(data);
            populateStateDropdown();
            populateMajorDropdown();
            applyFavorites(); // Apply favorites after markers are created
        })
        .catch(error => {
            console.error('Error loading JSON data:', error);
            alert('Failed to load map data. Please try again later.');
        });

    // Get the user's geolocation
    navigator.geolocation.getCurrentPosition(position => {
        userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        filterMarkers(); // Apply initial filtering based on user location
    }, error => {
        console.error('Error getting user location:', error);
        // Optionally, set a default location or notify the user
    });
}

    // Fetch the JSON data from last.json
    fetch('data/last.json') // Adjust the path if last.json is located elsewhere
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            processMapData(data);
            populateStateDropdown();
            populateMajorDropdown();
            applyFavorites(); // Apply favorites after markers are created
        })
        .catch(error => {
            console.error('Error loading JSON data:', error);
            alert('Failed to load map data. Please try again later.');
        });

    // Get the user's geolocation
    navigator.geolocation.getCurrentPosition(position => {
        userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        filterMarkers(); // Apply initial filtering based on user location
    }, error => {
        console.error('Error getting user location:', error);
        // Optionally, set a default location or notify the user
    });

// Process the fetched map data
function processMapData(data) {
    data.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        const latLng = new google.maps.LatLng(coords[1], coords[0]);
        const state = feature.properties.STATE;
        const city = feature.properties.CITY;

        // Populate stateCities
        if (!stateCities[state]) {
            stateCities[state] = new Set();
        }
        stateCities[state].add(city);

        // Populate majorTitles
        if (feature.properties.programs) {
            feature.properties.programs.forEach(program => {
                if(program.title){
                    majorTitles.add(program.title);
                }
            });
        }

        const schoolName = feature.properties.NAME; // Extract school name
        const url_extracted = feature.properties.school_url;

        // Create a Marker with a custom school icon
        const marker = new google.maps.Marker({
            position: latLng,
            map: map,
            title: `${schoolName}, ${city}, ${state}`,
            icon: {
                url: "images/school.png", // Custom school icon
                scaledSize: new google.maps.Size(15, 15) // Adjust size as needed
            },
            schoolName: schoolName,
            state: state,
            city: city,
            programs: feature.properties.programs ? feature.properties.programs.map(program => program.title) : [],
            actScores: feature.properties.act_scores,
            instate: feature.properties.in_state_tuition,
            outstate: feature.properties.out_of_state_tuition
        });

        markers.push(marker);

        // Create an InfoWindow for the marker
        const infoWindowContent = document.createElement('div');
        infoWindowContent.classList.add('info-window');

        const infoHeader = document.createElement('div');
        infoHeader.classList.add('info-window-header');
        infoHeader.textContent = schoolName;

        const favoriteBtn = document.createElement('button');
        favoriteBtn.classList.add('favorite-btn');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        if (favorites.includes(schoolName)) {
            favoriteBtn.classList.add('saved');
        }
        favoriteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(schoolName, marker);
            favoriteBtn.classList.toggle('saved');
        });

        infoHeader.appendChild(favoriteBtn);

        const infoBody = document.createElement('div');
        infoBody.classList.add('info-window-body');
        infoBody.innerHTML = `
            <p><strong>Address:</strong> ${feature.properties.address}, ${feature.properties.city}, ${feature.properties.state} ${feature.properties.zip_code}</p>
            <p><strong>Average Book Cost:</strong> $${parseInt(feature.properties.book_supply_cost).toLocaleString()}</p>
            <p><strong>In-State Tuition:</strong> $${parseInt(feature.properties.in_state_tuition).toLocaleString()}</p>
            <p><strong>Out-of-State Tuition:</strong> $${parseInt(feature.properties.out_of_state_tuition).toLocaleString()}</p>
            <p><strong>Website:</strong> <a href="https://${url_extracted}" target="_blank">${url_extracted}</a></p>
        `;

        infoWindowContent.appendChild(infoHeader);
        infoWindowContent.appendChild(infoBody);

        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent
        });
        marker.infoWindow = infoWindow;

        // Add click listener to open InfoWindow
        marker.addListener('click', function () {
            if (openInfoWindow) {
                openInfoWindow.close();

            }

            infoWindow.open(map, marker);
            map.setZoom(10);
            map.setCenter(marker.getPosition());

            openInfoWindow = infoWindow;
        });
    });
}

// Populate the state dropdown
function populateStateDropdown() {
    const stateSelect = document.getElementById('stateSelect');
    stateSelect.innerHTML = '<option value="">All States</option>';
    Object.keys(stateCities).sort().forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Populate the city dropdown based on selected state
function populateCityDropdown(selectedState) {
    const citySelect = document.getElementById('citySelect');
    citySelect.innerHTML = '<option value="">All Cities</option>';

    if (selectedState && stateCities[selectedState]) {
        Array.from(stateCities[selectedState]).sort().forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

// Populate the major dropdown
function populateMajorDropdown() {
    const majorSelect = document.getElementById('majorSelect');
    majorSelect.innerHTML = '<option value="">All Majors</option>';
    Array.from(majorTitles).sort().forEach(major => {
        const option = document.createElement('option');
        option.value = major;
        option.textContent = major;
        majorSelect.appendChild(option);
    });
}

// Handle state change
function onStateChange() {
    const selectedState = document.getElementById('stateSelect').value;
    populateCityDropdown(selectedState);
    filterMarkers();
}

// Submit survey
function submitSurvey() {
    var fullName = document.getElementById('fullName').value.trim();
    var contactInfo = document.getElementById('contactInfo').value.trim();
    var feedback = document.getElementById('feedback').value.trim();
    var rating = document.getElementById('rating').value;  // Get the rating value

    // Basic Validation
    if (!fullName || !contactInfo || !feedback || rating === '0') {
        alert('Please fill in all fields and provide a rating.');
        return;
    }

    var data = {
        fullName: fullName,
        contactInfo: contactInfo,
        feedback: feedback,
        rating: rating  // Include the rating field in the data
    };

    sendSurveyData(data);

    // Clear the form fields
    document.getElementById('fullName').value = '';
    document.getElementById('contactInfo').value = '';
    document.getElementById('feedback').value = '';
    document.getElementById('rating').value = '0';

    const stars = document.querySelectorAll('.star');
    stars.forEach(s => s.classList.remove('active'));

    // Close the survey popup
    closeFeedbackForm();
}

// Close survey popup function
function closeFeedbackForm() {
    var popupWindow = document.getElementById("popup-window");
    popupWindow.style.display = "none";
}

// Send survey data to the backend
function sendSurveyData(data) {
    fetch('/submit-survey', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())  // Handle JSON response
    .then(data => {
        console.log('Response from backend:', data);
        alert('Thank you for your feedback!');
    })
    .catch(error => {
        console.error('Error submitting survey:', error);
        alert('Error submitting survey. Please try again.');
    });
}

// Reset all filters to default values
function resetFilters() {
    document.getElementById('stateSelect').value = '';
    document.getElementById('citySelect').value = '';
    document.getElementById('majorSelect').value = '';
    document.getElementById('actScore').value = 1;
    document.getElementById('actScoreDisplay').textContent = '1';
    document.getElementById('instate').value = 75000;
    document.getElementById('INStateDisplay').textContent = '$75,000';
    document.getElementById('outstate').value = 75000;
    document.getElementById('OUTStateDisplay').textContent = '$75,000';
    document.getElementById('distanceSlider').value = 3000;
    document.getElementById('distanceLimitDisplay').textContent = '3000+';

    document.getElementById('satScore').value = '';
    document.getElementById('convertedACTScore').value = '';

    filterMarkers();
}

// Filter markers based on selected criteria
function filterMarkers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedState = document.getElementById('stateSelect').value;
    const selectedCity = document.getElementById('citySelect').value;
    const selectedMajor = document.getElementById('majorSelect').value;
    const selectedACTScore = parseInt(document.getElementById('actScore').value, 10);
    const selectedInstate = parseInt(document.getElementById('instate').value, 10);
    const selectedOutstate = parseInt(document.getElementById('outstate').value, 10);
    const distanceLimit = parseInt(document.getElementById('distanceSlider').value, 10);

    markers.forEach(marker => {
        // Check if any relevant field is undefined or null
        const hasUndefinedOrNull = Object.values(marker).some(value => value === undefined || value === null);

        if (hasUndefinedOrNull) {
            marker.setVisible(false);
            return; // Skip the rest of the logic for this marker
        }

        const matchSearchTerm = marker.schoolName.toLowerCase().includes(searchTerm);
        const matchState = selectedState === '' || marker.state === selectedState;
        const matchCity = selectedCity === '' || marker.city === selectedCity;
        const matchMajor = selectedMajor === '' || marker.programs.includes(selectedMajor);
        const matchACTScore = isNaN(selectedACTScore) || (marker.actScores && marker.actScores.cumulative <= selectedACTScore);
        const matchInstate = (marker.instate !== null && !isNaN(selectedInstate)) ? (marker.instate <= selectedInstate) : true;
        const matchOutstate = isNaN(selectedOutstate) || (marker.outstate && marker.outstate <= selectedOutstate);

        // Calculate distance if user position is available
        let withinDistanceLimit = true;
        if (userPosition) {
            const markerPosition = marker.getPosition();
            const distance = calculateDistance(userPosition, markerPosition);
            withinDistanceLimit = distanceLimit === 3000 || (distance <= distanceLimit);
        }

        const isVisible = matchSearchTerm && matchState && matchCity && matchMajor && matchACTScore && matchInstate && matchOutstate && withinDistanceLimit;

        marker.setVisible(isVisible);

        // Close the info window associated with the marker if it's not visible
        if (!isVisible && marker.infoWindow) {
            marker.infoWindow.close();
        }
    });
}

function convertSATtoACT() {
    const satScoreInput = document.getElementById('satScore');
    const convertedACTScoreOutput = document.getElementById('convertedACTScore');

    // Use the lookup table for conversion with ranges
    const satScore = parseInt(satScoreInput.value, 10);

    if (isNaN(satScore)) {
        convertedACTScoreOutput.value = '';
        return;
    }

    // Find the range for the SAT score
    let convertedACTScore = 'N/A';
    for (const range in satToActConversionTable) {
        const [start, end] = range.split('-').map(Number);
        if (satScore >= start && satScore <= end) {
            convertedACTScore = satToActConversionTable[range];
            break;
        }
    }

    // Update the converted ACT score display
    convertedACTScoreOutput.value = convertedACTScore !== 'N/A' ? convertedACTScore : 'N/A';
}

// Attach event listener to the SAT input field to trigger conversion
document.getElementById('satScore').addEventListener('input', convertSATtoACT);

// Toggle favorite schools
function toggleFavorite(schoolName, marker) {
    if (favorites.includes(schoolName)) {
        favorites = favorites.filter(fav => fav !== schoolName);
        marker.setIcon({
            url: "https://maps.google.com/mapfiles/kml/shapes/schools.png", // Default school icon
            scaledSize: new google.maps.Size(32, 32)
        });
    } else {
        favorites.push(schoolName);
        marker.setIcon({
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Favorite icon (red dot)
            scaledSize: new google.maps.Size(32, 32)
        });
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    console.log('Favorites:', favorites);
}

// Apply favorites from localStorage
function applyFavorites() {
    markers.forEach(marker => {
        if (favorites.includes(marker.schoolName)) {
            marker.setIcon({
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", // Favorite icon (red dot)
                scaledSize: new google.maps.Size(32, 32)
            });
        }
    });
}

// Load favorites from localStorage on initialization
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('favorites')) {
        favorites = JSON.parse(localStorage.getItem('favorites'));
        applyFavorites();
    }

    // Attach event listeners to inputs
    document.getElementById('searchInput').addEventListener('input', filterMarkers);
    document.getElementById('stateSelect').addEventListener('change', onStateChange);
    document.getElementById('citySelect').addEventListener('change', filterMarkers);
    document.getElementById('majorSelect').addEventListener('change', filterMarkers);
    document.getElementById('actScore').addEventListener('input', () => {
        updateACTScoreDisplay(document.getElementById('actScore').value);
        filterMarkers();
    });
    document.getElementById('instate').addEventListener('input', () => {
        updateINStateDisplay(document.getElementById('instate').value);
        filterMarkers();
    });
    document.getElementById('outstate').addEventListener('input', () => {
        updateOUTStateDisplay(document.getElementById('outstate').value);
        filterMarkers();
    });
    document.getElementById('distanceSlider').addEventListener('input', () => {
        updateDistanceLimitDisplay(document.getElementById('distanceSlider').value);
        filterMarkers();
    });

    // Attach event listeners to the hamburger button
    document.getElementById('hamburgerButton').addEventListener('click', toggleSidebar);
});

// Open Feedback Form
function openFeedbackForm() {
    var popupWindow = document.getElementById("popup-window");
    popupWindow.style.display = "block";
}

// Event listeners for feedback form stars and closing popup
document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating');
    const popupWindow = document.getElementById("popup-window");
    const closePopup = document.querySelector(".close-popup");

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            ratingInput.value = rating;

            // Remove 'active' class from all stars
            stars.forEach(s => s.classList.remove('active'));

            // Add 'active' class to selected stars
            for (let i = 0; i < rating; i++) {
                stars[i].classList.add('active');
            }
        });

        // Highlight stars on hover
        star.addEventListener('mouseover', () => {
            const hoverRating = parseInt(star.getAttribute('data-rating'));
            stars.forEach((s, index) => {
                if (index < hoverRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });

        // Remove highlight when not hovering
        star.addEventListener('mouseout', () => {
            const currentRating = parseInt(ratingInput.value);
            stars.forEach((s, index) => {
                if (index < currentRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Close popup when clicking the close button
    closePopup.addEventListener('click', () => {
        popupWindow.style.display = "none";
    });

    // Close popup when clicking outside the popup window
    window.addEventListener('click', (event) => {
        if (event.target == popupWindow) {
            popupWindow.style.display = "none";
        }
    });
});

// Calculate distance between two positions using the Haversine formula
function calculateDistance(userPosition, markerPosition) {
    const R = 3958.8; // Radius of the Earth in miles
    const lat1 = userPosition.lat();
    const lon1 = userPosition.lng();
    const lat2 = markerPosition.lat();
    const lon2 = markerPosition.lng();

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in miles
    return distance;
}

// Update the displayed ACT score
function updateACTScoreDisplay(value) {
    document.getElementById('actScoreDisplay').textContent = value;
}

// Update the displayed Instate tuition
function updateINStateDisplay(value) {
    const formattedValue = parseInt(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('INStateDisplay').textContent = formattedValue;
}

// Update the displayed Outstate tuition
function updateOUTStateDisplay(value) {
    const formattedValue = parseInt(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('OUTStateDisplay').textContent = formattedValue;
}

// Update the displayed Distance Limit
function updateDistanceLimitDisplay(value) {
    const display = document.getElementById('distanceLimitDisplay');
    display.textContent = value >= 3000 ? '3000+' : `${value} miles`;
}

// Convert SAT score to ACT score using the conversion table
function convertSATtoACT() {
    const satScoreInput = document.getElementById('satScore');
    const convertedACTScoreOutput = document.getElementById('convertedACTScore');

    // Use the lookup table for conversion with ranges
    const satScore = parseInt(satScoreInput.value, 10);

    if (isNaN(satScore)) {
        convertedACTScoreOutput.value = '';
        return;
    }

    // Find the range for the SAT score
    let convertedACTScore = 'N/A';
    for (const range in satToActConversionTable) {
        const [start, end] = range.split('-').map(Number);
        if (satScore >= start && satScore <= end) {
            convertedACTScore = satToActConversionTable[range];
            break;
        }
    }

    // Update the converted ACT score display
    convertedACTScoreOutput.value = convertedACTScore !== 'N/A' ? convertedACTScore : 'N/A';
}

// Toggle the sidebar visibility via hamburger button
function toggleSidebar() {
    const controls = document.getElementById('controls');
    const map = document.getElementById('map');
    const hamburger = document.getElementById('hamburgerButton');

    controls.classList.toggle('collapsed');

    // Adjust map margin
    if (controls.classList.contains('collapsed')) {
        map.style.marginLeft = '0';
    } else {
        map.style.marginLeft = '300px';
    }
}

// Optional: Close sidebar when clicking outside of it
window.addEventListener('click', function(event) {
    const controls = document.getElementById('controls');
    const hamburger = document.getElementById('hamburgerButton');
    const target = event.target;

    if (!controls.contains(target) && !hamburger.contains(target) && !controls.classList.contains('collapsed')) {
        controls.classList.add('collapsed');
        document.getElementById('map').style.marginLeft = '0';
    }
});

