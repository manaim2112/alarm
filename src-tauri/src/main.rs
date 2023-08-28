// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::{File, create_dir}, io::{BufReader, Write}, path::Path, sync::Arc};
use rodio::{Decoder, OutputStream, Sink};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::State;



#[derive(Clone)]
struct Alarm {
    sink: Arc<Mutex<Option<Sink>>>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    print!("LASKdasd");
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_alarm() -> Value {
    let h = File::open("./db/alarm.db").unwrap();

    let buff = BufReader::new(h);

    serde_json::from_reader(buff).unwrap()
}

#[derive(Debug, Serialize, Deserialize)]
struct AlarmType {
    id : String,
    name : String,
    src : String
}

#[tauri::command]
fn set_alarm(data : Vec<AlarmType>) -> bool {
    let mut h = File::open("./db/alarm.db").unwrap();
    let u = serde_json::to_vec(&data).unwrap();

    let _ = h.write(&u).unwrap();
    return true

}




// #[tauri::command]
// fn stop_audio(alarm: State<Alarm>) -> bool {
//     let mut ctx = alarm.sink.lock().unwrap();
//     if let Some(sink) = ctx.take() {
//         sink.stop();
//     }
//     true
// }

#[tauri::command]
fn play_audio(src: &str, alarm: State<Alarm>) -> bool {
    let (_stream, stream_handle) = OutputStream::try_default().unwrap();
    let sink = Sink::try_new(&stream_handle).unwrap();

    let open = match File::open(src) {
        Ok(r) => r,
        Err(_) => return false,
    };

    let file = BufReader::new(open);
    let source = Decoder::new(file).unwrap();

    let mut _ctx = alarm.sink.lock().unwrap();
    // if let Some(old_sink) = ctx.take() {
    //     old_sink.stop();
    // }
    sink.append(source);
    // *ctx = Some(sink);
    sink.set_volume(1.0);
    sink.sleep_until_end();

    true
}


#[tauri::command]
fn isdev () ->  bool {
    if cfg!(debug_assertions) {
        // Do something that is only done in development
        true
      } else {
        false
        // Do something that is only done in production
      }
}



fn main() {
    let log_dir = "./db";
    let path = Path::new(log_dir);
    if !path.exists() {
        create_dir(path).expect("Gagal membuat direktori logger");
    }

    // Write File Guru
    let fileguru = format!("{}/alarm.db", log_dir);
    if !Path::exists(Path::new(&fileguru)) {
        let mut guru_file = File::create(fileguru).unwrap();
        let u = json!([
            {
                "id" : "1",
                "name" : "Demo Alarm",
                "time" : "03:45",
                "src" : r"E:\Musics\Nada Bel Sekolah Lengkap - 19 Juli 2017 (FDS - New Update)\Bel Ujian Variasi 2\Mengerjakan Soal Ujian.mp3"
            }
        ]);
        let h = serde_json::to_vec(&u).unwrap();
        let _ = guru_file.write(&h).unwrap();
    }
    tauri::Builder::default()
        .manage(Alarm { sink : Default::default()})
        .invoke_handler(tauri::generate_handler![greet, play_audio, get_alarm, set_alarm, isdev])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
