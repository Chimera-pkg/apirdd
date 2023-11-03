import os
import cv2
import json
from PIL import Image
from ultralytics import YOLO
import sys  


def load_model(model_path):
    return YOLO(model_path)


def process_image(model, image_path, image_output_path):
    results = model.predict(image_path)
    annotated_img = results[0].plot()
    annotated_img = Image.fromarray(annotated_img[..., ::-1])
    annotated_img.save(image_output_path)

    data_json = json.loads(results[0].tojson())
    objects_detected = {}

    for data in data_json:
        class_name = data["name"]
        confidence = round(data["confidence"], 2)

        if class_name in objects_detected:
            objects_detected[class_name]["confidence_sum"] += confidence
            objects_detected[class_name]["count"] += 1
        else:
            objects_detected[class_name] = {
                "confidence_sum": round(confidence, 2),
                "count": 1
            }

    for class_name, info in objects_detected.items():
        average_confidence = info["confidence_sum"] / info["count"]
        objects_detected[class_name]["average_confidence"] = round(average_confidence, 2)
    
    return objects_detected


def save_summary_image(objects_detected, json_output_path):
    with open(json_output_path, 'w') as json_file:
        json.dump(objects_detected, json_file, indent=4)

    

def main():
    # Input
    model_name = 'best_rdd_final.pt'
    image_path = sys.argv[1]
    base_path, extension = os.path.splitext(image_path)
    output_suffix = f'_output'
    summary_suffix = f'_summary'
    image_output_path = f'{base_path}{output_suffix}{extension}'
    json_output_path = f'{base_path}{summary_suffix}.json'

    # Load model
    model_path = os.path.join('models', model_name)
    model = load_model(model_path)

    # Process image
    objects_detected = process_image(model, image_path, image_output_path)
    
    # Save summary
    save_summary_image(objects_detected, json_output_path)

    print('Processing completed!')


if __name__ == "__main__":
    main()
