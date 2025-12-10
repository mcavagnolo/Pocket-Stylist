export const getWeatherForecast = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=auto`
    );
    const data = await response.json();
    
    const forecast = {};
    data.daily.time.forEach((date, index) => {
      forecast[date] = {
        max: Math.round(data.daily.temperature_2m_max[index]),
        min: Math.round(data.daily.temperature_2m_min[index]),
        code: data.daily.weathercode[index]
      };
    });
    return forecast;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};

export const getWeatherDescription = (code) => {
  // Simple mapping for WMO Weather interpretation codes (WW)
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    95: 'Thunderstorm',
  };
  return codes[code] || 'Variable';
};
