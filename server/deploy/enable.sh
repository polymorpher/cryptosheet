#!/bin/sh
sudo cp cryptosheet.service /etc/systemd/system/cryptosheet.service
sudo systemctl enable cryptosheet
sudo systemctl start cryptosheet
systemctl status cryptosheet
