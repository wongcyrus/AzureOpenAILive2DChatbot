import live2d
import cv2
# Load the image
image = cv2.imread("cartoon_bee.png")
# Create a Live2D model
model = live2d.Model("cartoon_bee.model")
# Separate the image into layers
layers = cv2.split(image)
# Set the layers on the model
for layer, index in zip(layers, range(len(layers))):
    model.set_layer(index, layer)
# Save the model
model.save("cartoon_bee.cmox")