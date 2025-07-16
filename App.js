import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Image
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';

const API_KEY = 'b8895692337859bba5259070435b3b0a';
const { width } = Dimensions.get('window');

const App = () => {
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [units, setUnits] = useState('metric');
  const [theme, setTheme] = useState('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Доступ к местоположению запрещен');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      fetchWeather(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const fetchWeather = async (lat, lon) => {
    try {
      setLoading(true);
      
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}&lang=ru`
      );
      const weatherData = await weatherResponse.json();
      
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}&lang=ru`
      );
      const forecastData = await forecastResponse.json();
      
      const now = new Date().getHours();
      const newTheme = (now > 6 && now < 20) ? 'day' : 'night';
      setTheme(newTheme);
      
      setWeather({
        city: weatherData.name,
        country: weatherData.sys?.country,
        temperature: `${Math.round(weatherData.main.temp)}°${units === 'metric' ? 'C' : 'F'}`,
        condition: weatherData.weather[0].description,
        humidity: `${weatherData.main.humidity}%`,
        wind: `${Math.round(weatherData.wind.speed)} ${units === 'metric' ? 'м/с' : 'миль/ч'}`,
        pressure: `${weatherData.main.pressure} гПа`,
        icon: weatherData.weather[0].icon,
        feelsLike: `${Math.round(weatherData.main.feels_like)}°${units === 'metric' ? 'C' : 'F'}`,
        sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        visibility: `${weatherData.visibility / 1000} км`,
        clouds: `${weatherData.clouds.all}%`
      });
      
      const dailyForecast = [];
      const forecastByDay = {};
      
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('ru-RU');
        if (!forecastByDay[date]) {
          forecastByDay[date] = {
            date,
            weekday: new Date(item.dt * 1000).toLocaleDateString('ru-RU', { weekday: 'long' }),
            items: []
          };
        }
        forecastByDay[date].items.push({
          time: new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          temp: `${Math.round(item.main.temp)}°`,
          icon: item.weather[0].icon,
          condition: item.weather[0].description,
          humidity: `${item.main.humidity}%`,
          wind: `${Math.round(item.wind.speed)} ${units === 'metric' ? 'м/с' : 'миль/ч'}`,
          pressure: `${item.main.pressure} гПа`
        });
      });
      
      Object.keys(forecastByDay).slice(0, 5).forEach(date => {
        const day = forecastByDay[date];
        const avgTemp = Math.round(day.items.reduce((sum, item) => sum + parseInt(item.temp), 0) / day.items.length);
        dailyForecast.push({
          date: day.date,
          weekday: day.weekday,
          temp: `${Math.round(avgTemp)}°`,
          icon: day.items[Math.floor(day.items.length / 2)].icon,
          fullData: day.items
        });
      });
      
      setForecast(dailyForecast);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setErrorMsg('Ошибка при получении данных о погоде');
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${searchQuery}&units=${units}&appid=${API_KEY}&lang=ru`
      );
      const data = await response.json();
      
      if (data.cod === 200) {
        fetchWeather(data.coord.lat, data.coord.lon);
        if (!cities.some(c => c.id === data.id)) {
          setCities(prev => [
            { id: data.id, name: data.name, country: data.sys.country, lat: data.coord.lat, lon: data.coord.lon },
            ...prev.slice(0, 4)
          ]);
        }
      } else {
        setErrorMsg('Город не найден');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Ошибка при поиске города');
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day) => {
    setSelectedDay(day);
    setModalVisible(true);
  };

  const handleCityPress = (city) => {
    setSearchQuery(`${city.name}, ${city.country}`);
    fetchWeather(city.lat, city.lon);
  };

  const toggleUnits = () => {
    setUnits(units === 'metric' ? 'imperial' : 'metric');
    if (location) {
      fetchWeather(location.coords.latitude, location.coords.longitude);
    }
  };

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      '01d': 'weather-sunny',
      '01n': 'weather-night',
      '02d': 'weather-partly-cloudy',
      '02n': 'weather-night-partly-cloudy',
      '03d': 'weather-cloudy',
      '03n': 'weather-cloudy',
      '04d': 'weather-cloudy',
      '04n': 'weather-cloudy',
      '09d': 'weather-rainy',
      '09n': 'weather-rainy',
      '10d': 'weather-pouring',
      '10n': 'weather-pouring',
      '11d': 'weather-lightning',
      '11n': 'weather-lightning',
      '13d': 'weather-snowy',
      '13n': 'weather-snowy',
      '50d': 'weather-fog',
      '50n': 'weather-fog'
    };
    return iconMap[iconCode] || 'weather-sunny';
  };

  if (errorMsg) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <MaterialIcons name="error-outline" size={50} color="#fff" />
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setErrorMsg(null)}>
          <Text style={styles.retryButtonText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !weather) {
    return (
      <View style={[styles.container, styles.loadingContainer, theme === 'day' ? styles.dayTheme : styles.nightTheme]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    );
  }

  return (
    <ImageBackground 
      source={theme === 'day' ? require('./assets/day-bg.jpg') : require('./assets/night-bg.jpg')} 
      style={styles.container}
      blurRadius={1}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView>
          <View style={styles.header}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск города..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                <MaterialIcons name="search" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleUnits} style={styles.unitsButton}>
                <Text style={styles.unitsButtonText}>{units === 'metric' ? '°C' : '°F'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {cities.length > 0 && (
            <View style={styles.citiesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cities.map(city => (
                  <TouchableOpacity 
                    key={city.id} 
                    style={styles.cityBadge}
                    onPress={() => handleCityPress(city)}
                  >
                    <Text style={styles.cityBadgeText}>{city.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {weather && (
            <View style={[styles.weatherCard, theme === 'day' ? styles.dayCard : styles.nightCard]}>
              <View style={styles.weatherHeader}>
                <MaterialIcons name="location-on" size={24} color="#fff" />
                <Text style={styles.cityText}>{weather.city}, {weather.country}</Text>
              </View>
              
              <View style={styles.weatherMain}>
                <Image 
                  src={`http://openweathermap.org/img/w/${weather.icon}.png`} 
                  alt="Weather icon"
                  style={{ width: 60, height: 60 }} 
                />
                <Text style={styles.temperatureText}>{weather.temperature}</Text>
              </View>
              
              <Text style={styles.conditionText}>{weather.condition}</Text>
              <Text style={styles.feelsLikeText}>Ощущается как {weather.feelsLike}</Text>
              
              <View style={styles.weatherDetails}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="opacity" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.humidity}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="air" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.wind}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="speed" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.pressure}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="visibility" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.visibility}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="wb-sunny" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.sunrise}</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="wb-twilight" size={20} color="#fff" />
                  <Text style={styles.detailText}>{weather.sunset}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.forecastContainer}>
            <Text style={styles.sectionTitle}>Прогноз на 5 дней</Text>
            <View style={styles.forecastList}>
              {forecast.map((day, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.forecastItem}
                  onPress={() => handleDayPress(day)}
                >
                  <Text style={styles.forecastDay}>{day.weekday.split(',')[0]}</Text>
                  <Image 
                    src={`http://openweathermap.org/img/w/${day.icon}.png`} 
                    alt="Weather icon"
                    style={{ width: 60, height: 60 }} 
                  />
                  <Text style={styles.forecastTemp}>{day.temp}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, theme === 'day' ? styles.dayCard : styles.nightCard]}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              {selectedDay && (
                <>
                  <Text style={styles.modalTitle}>{selectedDay.weekday}</Text>
                  
                  <ScrollView>
                    {selectedDay.fullData.map((item, index) => (
                      <View key={index} style={styles.hourlyItem}>
                        <Text style={styles.hourlyTime}>{item.time}</Text>
                        <View style={styles.hourlyMain}>
                          <Image 
                            src={`http://openweathermap.org/img/w/${item.icon}.png`} 
                            alt="Weather icon"
                            style={{ width: 60, height: 60 }} 
                          />
                          <Text style={styles.hourlyTemp}>{item.temp}</Text>
                        </View>
                        <Text style={styles.hourlyCondition}>{item.condition}</Text>
                        <View style={styles.hourlyDetails}>
                          <Text style={styles.hourlyDetail}>💧 {item.humidity}</Text>
                          <Text style={styles.hourlyDetail}>🌬️ {item.wind}</Text>
                          <Text style={styles.hourlyDetail}>📊 {item.pressure}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Обновлено: {new Date().toLocaleTimeString()}</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  dayTheme: {
    backgroundColor: '#87CEEB',
  },
  nightTheme: {
    backgroundColor: '#191970',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF4500',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FF4500',
    fontWeight: 'bold',
  },
  header: {
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    height: 40,
  },
  searchButton: {
    padding: 5,
  },
  unitsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 5,
    borderRadius: 15,
    width: 40,
    alignItems: 'center',
    marginLeft: 10,
  },
  unitsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  citiesContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  cityBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  cityBadgeText: {
    color: '#fff',
  },
  dayCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.8)',
  },
  nightCard: {
    backgroundColor: 'rgba(25, 25, 112, 0.8)',
  },
  weatherCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityText: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 10,
    fontWeight: '600',
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  temperatureText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  conditionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  feelsLikeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  weatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  detailText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  forecastContainer: {
    marginTop: 20,
    marginHorizontal: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  forecastList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 10,
  },
  forecastItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: (width - 50) / 5,
  },
  forecastDay: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  forecastTemp: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  footer: {
    alignItems: 'center',
    padding: 10,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  hourlyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  hourlyTime: {
    color: '#fff',
    fontWeight: 'bold',
  },
  hourlyMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  hourlyTemp: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  hourlyCondition: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  hourlyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourlyDetail: {
    color: '#fff',
    fontSize: 12,
  },
});

export default App;