from collections import deque
import serial
import sys

import paho.mqtt.client as mqtt # For MQTT

def on_connect(client, userdata, flags, rc):
  print('Connected with result code {}'.format(rc))

client = mqtt.Client()
client.on_connect = on_connect

ip = '192.168.0.38'
if len(sys.argv) == 2:
  ip = sys.argv[1]	
client.connect(ip, 1883, 60)
client.loop_start()

serialPort = serial.Serial('/dev/ttyS1', 9600, timeout=2)
if not serialPort.isOpen():
  print("Error: Failed to initialize serial port")
  exit()

cache = deque()
n = 60            # Max number of elements in deque
t = 0             # Current number of elements in deque
cum_sum = 0       # Cumulative sum
avg = 0           # Running average over last n elements

while True:
  value = serialPort.readline()

  cache.append(int(value))
  cum_sum += int(value)
  t += 1
  if t <= n:
    avg = int(cum_sum / float(t))
  else:
    cum_sum -= cache.popleft()
    avg = int(cum_sum / float(n)) 
  print(avg)

  if not t % 60: # Only publish once every minute
    client.publish('plants/soilmoisture', str(avg))
    client.loop(timeout=1.0, max_packets=1)

