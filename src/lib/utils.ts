import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
  O tailwind-merge só reconhece os tamanhos de fonte padrão (text-sm, text-lg…).
  Sem esta extensão, `text-body`/`text-caption` do nosso tema são lidos como
  *cores* e, ao se juntarem a uma cor real (`text-primary-foreground`), um
  apaga o outro — foi assim que o botão primário perdia a cor do texto
  (contraste 2.53, reprovado no Lighthouse) e o tamanho da fonte.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'heading', 'body-lg', 'body', 'caption', 'tiny'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
