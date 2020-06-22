import machine
from ucollections import deque
from umqtt.robust import MQTTClient
import utime

adc = machine.ADC(0)
c = MQTTClient("NodeMCU_client", "<MQTT server IP here>")

# Print diagnostic messages with retries/reconnects
c.DEBUG = True

c.connect()

cache = deque((), 60)
n = 60
t = 0
cum_sum = 0
avg = 0

while True:
    value = adc.read()

    cache.append(int(value))
    cum_sum += int(value)
    t += 1
    if t <= n:
        avg = int(cum_sum / float(t))
    else:
        cum_sum -= cache.popleft()
        avg = int(cum_sum / float(n))
    print(avg)

    if not t % 60:
        c.publish("plants_nodemcu/soilmoisture", str(avg))

    utime.sleep_ms(1000)

