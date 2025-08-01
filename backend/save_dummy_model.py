from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import save_model

# Load MobileNetV2 with pretrained weights (ImageNet), including the classification head
model = MobileNetV2(weights='imagenet', include_top=True)

# Save the model to a file so we can load it in our Flask app
save_model(model, 'mobilenetv2.h5')

print("Model saved as 'mobilenetv2.h5'")
