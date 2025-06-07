#!/bin/bash
if pkill swayidle; then
    notify-send "Swayidle desativado."
else
    swayidle -w timeout 180 'swaylock -f' &
    notify-send "Swayidle ativado."
fi
