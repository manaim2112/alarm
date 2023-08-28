const { invoke } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { writeFile, BaseDirectory, createDir, readTextFile, exists } = window.__TAURI__.fs;
const { message, confirm } = window.__TAURI__.dialog;

export default function Main() {

}


/**
 * Checking Development Mode or Production Mode
 * @returns bool
 */
export const IsDev =  async () => await invoke("isdev");
// Directory Condition of IsDev function
export const DIR = async () => await IsDev() ? BaseDirectory.Data : BaseDirectory.App;

// alarm ring audio Array
let alarm = [];
// Set Name File Alarm
export const ALARM_FILE = "alarm.db"
export const DEFAULT_ALARM = [{"id" : "1","name" : "Demo Alarm","time" : "03:45","src" : "E:\Musics\Nada Bel Sekolah Lengkap - 19 Juli 2017 (FDS - New Update)\Bel Ujian Variasi 2\Mengerjakan Soal Ujian.mp3"}];

// set default settings
export const SETTING_FILE = "setting.db"
export const DEFAULT_SETTING = {"name" : "Nama Sekolah Anda","logo" : "/assets/logo.png","background" : "","token" : ""};

/**
 * Compress Image 
 * @param {File} file 
 * @param {Function} callback 
 * @returns File
 */
export async function compressImage(file, callback) {
  return new Compressor(file, {
    quality: 0.6,

    // The compression process is asynchronous,
    // which means you have to access the `result` in the `success` hook function.
    success(result) {
      callback(result)
    },
    error(err) {
      console.log(err.message);
    },
  });
}

/**
 * [{ id : String, name : String, time : Timestamps, src : String }]
 * @returns bool
 */
export const set_alarm = async (arr) => {
  await writeFile(ALARM_FILE, JSON.stringify(arr), { dir : await DIR()})
  return true
}
/**
 * [{ id : String, name : String, time : Timestamps, src : String }]
 * @returns Object
 */
export const get_alarm = async () => {
  return Json(await readTextFile(ALARM_FILE, { dir: await DIR() }));
}
/**
 * Get Settings Alarm
 * @returns Object
 */
export const get_settings = async () => {
   return Json(await readTextFile(SETTING_FILE, { dir : await DIR() }))
}

/**
 * Json Checking..
 * @param {*} obj 
 * @returns Object|bool
 */
export const Json = (obj) => {
  try {
    return JSON.parse(obj)
  } catch (error) {
    return false
  }
}

/**
 * Convert Image to Base64 Code
 * @param {File} image 
 * @returns base64
 */
export async function  imageToBase64(image) {
  const reader = new FileReader();
  reader.readAsDataURL(image);
  const data= await new Promise((resolve, reject) => {
 
    reader.onload = () => resolve(reader.result);
 
    reader.onerror = error => reject(error);
 
   });
  return data;
}

/**
 * Insert Alarm
 * @param {String} src 
 * @param {String} name 
 * @param {String} time 
 * @returns bool
 */
export const add_alarm = async (src, name, time) => {
  const id = URL.createObjectURL(new Blob([])).slice(-36);
  const get = await get_alarm();
  get.push({src, name, time, id});

  const y = await set_alarm(get)
  if(y) {
    await render_again()
    return true
  }

  return false
}

/**
 * Remove Alarm with Spesific
 * @param {UUID} id 
 * @returns bool
 */
export const remove_alarm = async (id) => {
  let get = await get_alarm();
  const ids = get.findIndex(e => e.id == id);
  if(ids === -1) return false;
  get.splice(ids, 1);
  const y = await set_alarm(get)
  if(y) {
    await render_again()
    return true
  }

  return false
}

export const starting_alarm = (list) => {
  const now = Date.now();
  return list.map(r => {
    const date = new Date();
    const time = r.time.split(":");
    date.setHours(time[0])
    date.setMinutes(time[1])
    const parse = Date.parse(date);
    r.count = parse - now - 15*1000;
    return r
  }).filter(Obj => Obj.count > 0).sort((a,b) => a.count - b.count);
}

export const Countdown = (list) => {
  list.forEach(element => {
    if(element.count > 0) {
      const play = setTimeout(async () => {
        const y = await invoke("play_audio", {src : element.src})
        if(!y) {
          alert("Failed to ring")
        }
        render_alarm();
      }, element.count)
      alarm.push(play)
    }
  });
}

/**
 * @returns bool|Notification
 */
export const checkAndWrite = async () => {
  try {
    
    if(!await exists(ALARM_FILE, { dir: await DIR() }) || !await exists(SETTING_FILE, { dir : await DIR() })) {
      await createDir("com.alarmyami.app", { dir : BaseDirectory.Data });
      await writeFile(ALARM_FILE, JSON.stringify(DEFAULT_ALARM), { dir: await DIR() });
      await writeFile(SETTING_FILE, JSON.stringify(DEFAULT_SETTING), { dir : await DIR()})
    }
  } catch (error) {
    await message("Terjadi Kesalahan", { title : "Notification", type : "error"})
  }
}


/**
 * 
 */

async function listDir() {
  const a = await get_settings();
  const name = `
    <img src="${a.logo}" alt="logo"/>
    <div class="mt-3 text-white stroke-orange-400 drop-shadow-md text-xl font-black text-center">
      ${a.name}
    </div>
  `
  document.getElementById("settings").innerHTML = name;

  document.getElementById("header").style.backgroundImage = "url('"+ a.background +"')";
  document.getElementById("header").style.backgroundSize = "cover";

  document.querySelector(".name").innerText = a.name;
  document.querySelector(".logo").innerHTML = `<img src="${a.logo}" width="100" alt="logo"/>`;
  document.querySelector(".background").innerHTML = `<img src="${a.background}" width="100" alt="logo"/>`;
}



/**
 * clock View
 * @returns HTMLElement
 */
function clockPlay() {
  setInterval(() => {
    const date = new Date();
    const text = `${ date.getHours() < 10 ? "0"+date.getHours() : date.getHours() } : ${  date.getMinutes() < 10 ? "0"+date.getMinutes() : date.getMinutes()} : ${date.getSeconds() < 10 ? "0"+date.getSeconds() : date.getSeconds()}`;
    document.getElementById("clock").innerText = text; 
  }, 1000)
}



/**
 * 
 * @param {*} name 
 * @param {*} clock 
 * @param {*} src 
 * @returns HTMLElement
 */
const html_list = (name, clock, src, id) => {
  return `
      <div class="text-black shadow-sm hover:shadow-lg hover:bg-gradient-to-bl hover:from-blue-200 hover:to-purple-200 hover:text-purple-700 transition-shadow px-4 py-2 rounded-full font-bold text-xl flex mt-3">
      <div class="w-full capitalize text-left">
        ${name}
      </div>
      <div class="flex-none">
        <div class="flex gap-2 align-middle place-items-center">
          ${clock} <div class="inline-block rounded-full hover:bg-white/40 play_audio_manual" data-src="${src}">
            <img data-src="${src}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAExSURBVDiNxZA9S8NQFIbft0nrECHF/gRXKzh0cBNCKE5CXcW4uflHCuLk4CIWnSRdpMOtP8DBsbObUCf7AXUI5R6HNtdrUuPYs517OM993gOsu7jqcRoENTrOMYAdABByIEDsK/X5L2AahmcgrwD4mdFEyAtfqc6fgOXybZGykJENMYBpENTgOG/pz25jD3r4Af0+zDLGQm6ncUqGtMhstN39BrzrNjbOI3DTswFVat1KGwOASD3n67qoHB3Cu7lEOTz4yU3u5gGkFET/XaQ2fxgBcgDJMOZzJL1nJPePkNmXJSuDPACICbSxvMP85RVJ92nVEUe6XO4aGXsyaTZPKXJXZC/Aid/vP6R9yR76SnWEjACMV+yOsss5A8tki1q3SNaBRWZdqcTVXm9UZLee+gaNGmjcWcw/ZQAAAABJRU5ErkJggg==" alt="play" width="32" height="32"/>
          </div> 
          <div data-id="${id}" class="remove_alarm text-sm p-2 hover:bg-purple-500 hover:text-white font-normal cursor-pointer rounded-full"> HAPUS </div>     
        </div>
      </div>
    </div>
  `
}


/**
 * Setting View
 * @param {String} imgUrl 
 * @param {String} name 
 * @returns HTMLElement
 */
const html_settings = (imgUrl, name) => {
  imgUrl = (imgUrl.length < 1) ? "/assets/logo.png" : imgUrl;
  name = (name.length < 1) ? "Your Name Sekolah" : name;
  return `
    <img class="animate-pulse" src="${imgUrl}" alt="logo"/>
    <div class="mt-3 text-white stroke-orange-400 drop-shadow-md text-xl font-black text-center">
      ${name}
    </div>
  `
}


/**
 * Render HTML settings
 * @returns HTMLElement
 */
async function render_settings() {
  const y = await get_settings();

  const html = html_settings(y.logo, y.name)
  document.getElementById("settings").innerHTML = html;


  document.getElementById("closepopup").addEventListener("click", e => {
    document.getElementById("popup_full").classList.add("hidden")
  })
}


const render_html = (data) => {
  const y = [];
  data.forEach(e => {
    y.push(html_list(e.name, e.time, e.src, e.id))
  })

  if(y.length < 1) {

    document.getElementById("list_alarm").innerHTML = `<span class="text-blue-900 bg-yellow-100">Alarm Tidak Ada</span>`;
  } else {
    document.getElementById("list_alarm").innerHTML = y.join("");
  
    document.querySelectorAll(".play_audio_manual").forEach(e => {
      e.addEventListener("click", async evt => {
        const src = evt.target.dataset.src;
        if(src.length < 1) return;
        const y = await invoke("play_audio", {src})
        if(!y) {
          alert("Failed to ring")
        }
      })
    })
  
    document.querySelectorAll(".remove_alarm").forEach(e => {
      e.addEventListener("click", async evt => {
        const conf = await confirm("Anda yakin ingin menghapus ?");
        if(!conf) return;
        const id = evt.target.dataset.id;
        if(id.length < 1) return;
        const remove = await remove_alarm(id);
        if(!remove) return message("Tidak bisa menghapus", { title : "Notification", type : "error"})
      })
    })

  }


}







window.addEventListener("DOMContentLoaded", async () => {
  await checkAndWrite();
  clockPlay();
  await render_alarm();
  await render_settings();
  await listDir();
  await listFullElement(await get_alarm())
  document.getElementById("popup_trigger").addEventListener('click', e => {
    const u = document.getElementById("popup").classList.toggle("hidden")
    if(u) {
      e.target.innerText = "+ Tambah Alarm"
    } else {
      e.target.innerText = "- Keluar";
    }
  })

  document.getElementById("open_audio").addEventListener('click',async  e => {
    const y = await open({
      multiple: false,
      filters: [{
        name: 'music',
        extensions: ['mp3', 'ogg', 'wav']
      }]
    });

    if(!y) return;

    document.getElementById("result_audio").innerText = y;
  })
  document.getElementById("add_alarm").addEventListener('click', async  (evt) => {
    const name = document.getElementById("nameInput").value
    const time = document.getElementById("timeInput").value
    const audio = document.getElementById("result_audio").innerText;
    if(name.length < 1 || time.length < 1 || audio.length < 1) return message("Pastikan Di isi semua", { title : "Notification", type : "info"})
    const token = await add_alarm(audio, name, time);


    if(!token) return await message("Gagal Menambahkan", { title: 'YAMI alarm', type: 'error' })
  });

  document.querySelector(".update_setting").addEventListener("click", async (e) => {
    e.target.innerText = "Proses Pembaruan ...";
    const name = document.querySelector(".nameInput").value;
    const file = document.querySelector(".logoInput").files[0];
    const background = document.querySelector(".bgInput").files[0];
    if(!file || !background || name.length < 1) {
      e.target.innerText = "Update Settings";
      return message("Pastikan dilengkapi semuanya", { title : "Notification", type : "info"});
    } 

    compressImage(file, (result) => {
      const logo = result;

      compressImage(background, async r => {
        const bg = r;
        const imageLogo = await imageToBase64(logo);
        const backgroundLogo = await imageToBase64(bg);
        const ret = {
          name, 
          logo : imageLogo,
          background : backgroundLogo
        }
        const y = await writeFile(SETTING_FILE, JSON.stringify(ret), { dir : await DIR() })
        e.target.innerText = "Berhasil Updated";
        window.location.reload();
        return;

      })
    })


  })
});

const listFullElement = async  (list) => {
  const p = [];
  console.log(list);
  list.forEach(({id, name, time, src}) => {
    p.push(`
    <li class="flex w-full place-items-center"> 
      <div class="w-full"><span class="truncate ... max-w-xs">${name}<span></div> 
      <div class="flex-none flex place-items-center gap-1">
        ${time}
        <button class="bg-green-500 w-2 h-2 rounded-full" title="${id}" data-path="${id}"> </button>
        <button class="bg-blue-500 w-2 h-2 rounded-full" title="${src}" data-path="${src}"> </button>
      </div>
    </li>
  `)
  })
  document.querySelector(".list-full").innerHTML = p.join("") 
}





export const render_alarm = async () => {
  const a = await get_alarm();
  const list = starting_alarm(a);
  Countdown(list)
  render_html(list);  
}

export const render_again = async () => {
  alarm.forEach(e => {
    clearTimeout(e)
  })
  alarm.length = 0;
  return await render_alarm()
}









