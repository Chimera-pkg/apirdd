import os
import cv2
import json
import sys
from ultralytics import YOLO

def load_model(model_path):
    return YOLO(model_path)


def process_video(model, video_path, video_output_path):
    cap = cv2.VideoCapture(video_path)
    success, frame = cap.read()
    H, W, _ = frame.shape
    out = cv2.VideoWriter(video_output_path, cv2.VideoWriter_fourcc(*'H264'), int(cap.get(cv2.CAP_PROP_FPS)), (W, H))

    objects_detected_list = []
    last_objects_detected = {}
    frame_count = 0

    while cap is not None and cap.isOpened():
        success, frame = cap.read()
        if success:
            frame_count += 1
            results = model.predict(frame)
            annotated_frame = results[0].plot()
            out.write(annotated_frame)

            # Summary
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
                info["average_confidence"] = round(average_confidence * 100, 2)

            # Check object detected
            unique_objects_detected = {}
            for class_name, info in objects_detected.items():
                if class_name not in last_objects_detected or frame_count - last_objects_detected[class_name] > 1:
                    unique_objects_detected[class_name] = info

            last_objects_detected = {class_name: frame_count for class_name in objects_detected}

            if unique_objects_detected:
                objects_detected_list.append(unique_objects_detected)

        else:
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()

    return objects_detected_list

def summary_video(objects_detected_list):
    merged_objects_detected_list = {}
    for item in objects_detected_list:
        for key, value in item.items():
            if key in merged_objects_detected_list:
                merged_objects_detected_list[key]["confidence_sum"] += value["confidence_sum"]
                merged_objects_detected_list[key]["count"] += value["count"]
            else:
                merged_objects_detected_list[key] = value

    for key, value in merged_objects_detected_list.items():
        confidence_sum = value["confidence_sum"]
        count = value["count"]
        average_confidence = (confidence_sum / count) * 100
        value["average_confidence"] = f"{average_confidence:.2f}%"

    summary_objects_detected_list = [{key: value} for key, value in merged_objects_detected_list.items()]
    return summary_objects_detected_list



def save_summary_video(json_output_path, objects_detected_list):
    with open(json_output_path, 'w') as json_file:
        json.dump(objects_detected_list, json_file, indent=4)


def main():
    # Input
    video_path = sys.argv[1]
    base_path, extension = os.path.splitext(video_path)
    output_suffix = '_output'
    summary_suffix = '_summary'
    video_output_path = f'{base_path}{output_suffix}{extension}'
    json_output_path = f'{base_path}{summary_suffix}.json'

    # Load model
    model = load_model('models/best_rdd_final.pt')

    # Process video
    objects_detected_list = process_video(model, video_path, video_output_path)

    # Summary
    summary_objects_detected_list = summary_video(objects_detected_list)

    # Save summary
    save_summary_video(json_output_path, summary_objects_detected_list)


if __name__ == "__main__":
    main()
