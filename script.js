// =============================================
// script.js — SkyPulse Weather App
// =============================================
// HOW TO USE:
// 1. Get a free API key from https://openweathermap.org/api
// 2. Replace "YOUR_API_KEY" below with your real key
// 3. Open index.html in a browser
// =============================================

// ── STEP 1: Paste your OpenWeatherMap API key here ──
const apiKey = "cdfbbf976305f8046d4cc2622f40a098";

// OpenWeatherMap base URL (metric = Celsius)
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";


// ── DOM Elements (grabbing HTML elements by their ID) ──
const cityInput   = document.getElementById("cityInput");
const searchBtn   = document.getElementById("searchBtn");
const errorMsg    = document.getElementById("errorMsg");
const errorText   = document.getElementById("errorText");
const loaderWrap  = document.getElementById("loaderWrap");
const weatherResult = document.getElementById("weatherResult");
const headerDate  = document.getElementById("headerDate");


// ── On page load: show date & load last searched city ──
window.addEventListener("DOMContentLoaded", () => {
  // Show current date in the header
  showHeaderDate();

  // Load last city from localStorage (if any)
  const lastCity = localStorage.getItem("lastCity");
  if (lastCity) {
    cityInput.value = lastCity;
    fetchWeather(lastCity);   // auto-fetch for returning users
  }
});


// ── Search button click ──
searchBtn.addEventListener("click", () => {
  handleSearch();
});

// ── Enter key support ──
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});


// ──────────────────────────────────────────────
// handleSearch()
// Reads the input and triggers fetchWeather()
// ──────────────────────────────────────────────
function handleSearch() {
  const city = cityInput.value.trim();

  // Don't search if input is empty
  if (!city) {
    showError("Please enter a city name first.");
    return;
  }

  fetchWeather(city);
}


// ──────────────────────────────────────────────
// fetchWeather(city)
// Main async function: calls OpenWeatherMap API
// ──────────────────────────────────────────────
async function fetchWeather(city) {
  // Hide previous results/errors, show loader
  hideError();
  hideWeather();
  showLoader();

  try {
    // Build the API URL
    // q=city name, appid=your key, units=metric (Celsius)
    const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    // Fetch data from the API
    const response = await fetch(url);

    // If the API returns an error (e.g. 404 city not found)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`"${city}" not found. Check the spelling and try again.`);
      } else if (response.status === 401) {
        throw new Error("Invalid API key. Please check your key in script.js.");
      } else {
        throw new Error("Something went wrong. Please try again.");
      }
    }

    // Parse JSON response into a JavaScript object
    const data = await response.json();

    // Save searched city to localStorage so we can reload it next time
    localStorage.setItem("lastCity", city);

    // Hide loader, display the weather data
    hideLoader();
    displayWeather(data);

  } catch (error) {
    // Something went wrong — hide loader and show error message
    hideLoader();
    showError(error.message);
  }
}


// ──────────────────────────────────────────────
// displayWeather(data)
// Takes the API response and fills the UI
// ──────────────────────────────────────────────
function displayWeather(data) {
  // ── Pull values from the API response object ──
  const cityName    = data.name;
  const country     = data.sys.country;
  const temp        = Math.round(data.main.temp);
  const feelsLike   = Math.round(data.main.feels_like);
  const tempMin     = Math.round(data.main.temp_min);
  const tempMax     = Math.round(data.main.temp_max);
  const humidity    = data.main.humidity;
  const windSpeed   = Math.round(data.wind.speed * 3.6);  // m/s → km/h
  const visibility  = data.visibility ? (data.visibility / 1000).toFixed(1) : "N/A";
  const pressure    = data.main.pressure;
  const description = data.weather[0].description;
  const weatherId   = data.weather[0].id;   // used to pick emoji & aurora

  // Sunrise / Sunset — API gives Unix timestamp + timezone offset
  const timezone      = data.timezone;       // seconds offset from UTC
  const sunriseTime   = formatUnixTime(data.sys.sunrise, timezone);
  const sunsetTime    = formatUnixTime(data.sys.sunset,  timezone);
  const localDatetime = getLocalDatetime(timezone);

  // ── Fill HTML elements ──
  document.getElementById("cityName").textContent    = cityName;
  document.getElementById("countryBadge").textContent = country;
  document.getElementById("cityDatetime").textContent = localDatetime;
  document.getElementById("tempValue").textContent   = temp;
  document.getElementById("weatherDesc").textContent = description;
  document.getElementById("feelsLike").textContent   = `${feelsLike}°C`;
  document.getElementById("tempRange").innerHTML     =
    `↑ ${tempMax}°C &nbsp;·&nbsp; ↓ ${tempMin}°C`;
  document.getElementById("humidity").textContent    = `${humidity}%`;
  document.getElementById("windSpeed").textContent   = `${windSpeed} km/h`;
  document.getElementById("visibility").textContent  = `${visibility} km`;
  document.getElementById("pressure").textContent    = `${pressure} hPa`;
  document.getElementById("sunrise").textContent     = sunriseTime;
  document.getElementById("sunset").textContent      = sunsetTime;

  // Weather emoji based on condition code
  document.getElementById("weatherEmoji").textContent = getWeatherEmoji(weatherId);

  // Animate humidity bar (width = humidity %)
  const bar = document.getElementById("humidityBar");
  bar.style.width = "0";  // reset first so animation replays
  setTimeout(() => { bar.style.width = `${humidity}%`; }, 100);

  // Animate wind dots (5 dots, fill based on wind speed)
  renderWindDots(windSpeed);

  // Change aurora background color theme based on weather
  setAuroraTheme(weatherId);

  // Show the result section
  showWeather();
}


// ──────────────────────────────────────────────
// getWeatherEmoji(id)
// Maps OpenWeatherMap condition codes → emoji
// Full code list: https://openweathermap.org/weather-conditions
// ──────────────────────────────────────────────
function getWeatherEmoji(id) {
  if (id >= 200 && id < 300) return "⛈️";   // Thunderstorm
  if (id >= 300 && id < 400) return "🌦️";   // Drizzle
  if (id >= 500 && id < 600) return "🌧️";   // Rain
  if (id >= 600 && id < 700) return "❄️";   // Snow
  if (id === 701)             return "🌫️";   // Mist
  if (id === 711)             return "🌫️";   // Smoke
  if (id === 721)             return "🌫️";   // Haze
  if (id === 741)             return "🌫️";   // Fog
  if (id === 761 || id===762) return "🌋";   // Dust/Ash
  if (id === 781)             return "🌪️";   // Tornado
  if (id === 800)             return "☀️";   // Clear sky
  if (id === 801)             return "🌤️";   // Few clouds
  if (id === 802)             return "⛅";   // Scattered clouds
  if (id >= 803 && id < 900)  return "☁️";  // Cloudy
  return "🌡️";
}


// ──────────────────────────────────────────────
// setAuroraTheme(id)
// Changes the animated background based on weather
// ──────────────────────────────────────────────
function setAuroraTheme(id) {
  const root = document.documentElement;

  if (id === 800) {
    // Clear sky → warm golden
    root.style.setProperty("--aurora1", "#1a3a6a");
    root.style.setProperty("--aurora2", "#2d1a00");
    root.style.setProperty("--aurora3", "#0a2040");
  } else if (id >= 200 && id < 300) {
    // Thunderstorm → deep purple
    root.style.setProperty("--aurora1", "#2a0a4a");
    root.style.setProperty("--aurora2", "#1a0a3a");
    root.style.setProperty("--aurora3", "#0a0020");
  } else if (id >= 500 && id < 600) {
    // Rain → cool teal-blue
    root.style.setProperty("--aurora1", "#042a4a");
    root.style.setProperty("--aurora2", "#012040");
    root.style.setProperty("--aurora3", "#041a34");
  } else if (id >= 600 && id < 700) {
    // Snow → icy pale blue
    root.style.setProperty("--aurora1", "#1a2a4a");
    root.style.setProperty("--aurora2", "#1a3050");
    root.style.setProperty("--aurora3", "#0a2040");
  } else if (id >= 801 && id < 900) {
    // Cloudy → slate
    root.style.setProperty("--aurora1", "#1a2030");
    root.style.setProperty("--aurora2", "#141820");
    root.style.setProperty("--aurora3", "#101418");
  } else {
    // Default (mist, fog, etc.) → default deep navy
    root.style.setProperty("--aurora1", "#0f2460");
    root.style.setProperty("--aurora2", "#1a1060");
    root.style.setProperty("--aurora3", "#0a3040");
  }
}


// ──────────────────────────────────────────────
// renderWindDots(speed)
// Shows 5 dots; fills more dots for higher wind
// ──────────────────────────────────────────────
function renderWindDots(speed) {
  const container = document.getElementById("windDots");
  container.innerHTML = "";  // clear old dots

  // Determine how many dots to "activate"
  // 0-20 km/h = 1, 20-40 = 2, 40-60 = 3, 60-80 = 4, 80+ = 5
  const active = Math.min(5, Math.ceil(speed / 20)) || 1;

  for (let i = 0; i < 5; i++) {
    const dot = document.createElement("span");
    dot.className = "wind-dot" + (i < active ? " active" : "");
    container.appendChild(dot);
  }
}


// ──────────────────────────────────────────────
// formatUnixTime(unixTimestamp, timezoneOffset)
// Converts Unix timestamp to HH:MM in local city time
// ──────────────────────────────────────────────
function formatUnixTime(unix, tzOffset) {
  // API gives timezone in seconds offset from UTC
  const date = new Date((unix + tzOffset) * 1000);
  const hours   = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}


// ──────────────────────────────────────────────
// getLocalDatetime(tzOffset)
// Returns "Wednesday, 14 June 2025 · 14:32" in city's timezone
// ──────────────────────────────────────────────
function getLocalDatetime(tzOffset) {
  // Get UTC time in ms, add the city's timezone offset (in ms)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const cityDate = new Date(utcMs + tzOffset * 1000);

  const days    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months  = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"];

  const day    = days[cityDate.getDay()];
  const date   = cityDate.getDate();
  const month  = months[cityDate.getMonth()];
  const year   = cityDate.getFullYear();
  const hours  = String(cityDate.getHours()).padStart(2, "0");
  const mins   = String(cityDate.getMinutes()).padStart(2, "0");

  return `${day}, ${date} ${month} ${year} · ${hours}:${mins}`;
}


// ──────────────────────────────────────────────
// showHeaderDate()
// Shows today's date in the top-right of header
// ──────────────────────────────────────────────
function showHeaderDate() {
  const now    = new Date();
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];
  headerDate.textContent =
    `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}


// ── UI helper functions ──

function showLoader() {
  loaderWrap.style.display = "flex";
}

function hideLoader() {
  loaderWrap.style.display = "none";
}

function showWeather() {
  weatherResult.style.display = "flex";
}

function hideWeather() {
  weatherResult.style.display = "none";
}

function showError(message) {
  errorText.textContent = message;
  errorMsg.style.display = "flex";
}

function hideError() {
  errorMsg.style.display = "none";
}