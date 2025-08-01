from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
from PIL import Image
import numpy as np
import io
import base64
import matplotlib.pyplot as plt
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# Load the pre-trained model ONCE
model = load_model('mobilenetv2.h5')

def preprocess_image(image, target_size=(224, 224)):
    image = image.convert('RGB')
    image = image.resize(target_size)
    img_array = np.array(image)
    img_array = preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def make_gradcam_heatmap(img_array, model, last_conv_layer_name="Conv_1", pred_index=None):
    grad_model = tf.keras.models.Model(
        [model.inputs], [model.get_layer(last_conv_layer_name).output, model.output]
    )
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        if pred_index is None:
            pred_index = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]
    grads = tape.gradient(class_channel, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
    return heatmap.numpy()

@app.route('/')
def hello():
    return "DeepDetect Backend Live!"

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image provided"})
    file = request.files['image']
    image = Image.open(file.stream)
    img_array = preprocess_image(image)
    preds = model.predict(img_array)
    decoded = decode_predictions(preds, top=1)[0][0]
    label = decoded[1]
    confidence = float(decoded[2])
    explanation = f"CNN model thinks it's most likely a '{label}' ({confidence*100:.1f}%)"
    # Generate Grad-CAM heatmap
    heatmap = make_gradcam_heatmap(img_array, model)
    plt.figure()
    plt.axis('off')
    plt.imshow(image.resize((224, 224)))
    plt.imshow(heatmap, cmap='jet', alpha=0.5)
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
    plt.close()
    buf.seek(0)
    heatmap_bytes = buf.read()
    heatmap_b64 = "data:image/png;base64," + base64.b64encode(heatmap_bytes).decode('utf-8')
    return jsonify({
        "status": "success",
        "result": label,
        "confidence": confidence,
        "explanation": explanation,
        "heatmap": heatmap_b64
    })

if __name__ == '__main__':
    app.run(debug=True)
