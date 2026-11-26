// Minimal espeak-ng binding used by nabra-tts: text -> IPA phonemes.
// Mirrors phonemizer (python) EspeakWrapper.text_to_phonemes(text, tie=True).
#include <stdlib.h>
#include <string.h>
#include <espeak-ng/speak_lib.h>
#include <emscripten/emscripten.h>

static char *out = NULL;
static size_t out_cap = 0;

EMSCRIPTEN_KEEPALIVE
int nabra_init(const char *data_path, const char *voice) {
  int sr = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, data_path, 0);
  if (sr <= 0) return -1;
  return espeak_SetVoiceByName(voice) == EE_OK ? 0 : -2;
}

EMSCRIPTEN_KEEPALIVE
const char *nabra_text_to_phonemes(const char *text, int phoneme_mode) {
  const void *ptr = text;
  size_t len = 0;
  if (!out) { out_cap = 4096; out = malloc(out_cap); }
  out[0] = 0;
  while (ptr != NULL) {
    const char *ph = espeak_TextToPhonemes(&ptr, espeakCHARS_UTF8, phoneme_mode);
    if (!ph || !*ph) continue;
    size_t n = strlen(ph);
    if (len + n + 2 > out_cap) {
      while (len + n + 2 > out_cap) out_cap *= 2;
      out = realloc(out, out_cap);
    }
    if (len) out[len++] = ' ';
    memcpy(out + len, ph, n);
    len += n;
    out[len] = 0;
  }
  return out;
}
