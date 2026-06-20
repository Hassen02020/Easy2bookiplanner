import { z } from "zod"
import { isValidTunisianPhone } from "@/lib/phone"

export const leadFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est obligatoire."),
  lastName: z.string().min(1, "Le nom est obligatoire."),
  email: z.string().email("Adresse email invalide."),
  phone: z.string().refine(isValidTunisianPhone, {
    message: "Numéro de téléphone tunisien invalide. Formats acceptés : +216XXXXXXXX, 00216XXXXXXXX, ou 8 chiffres.",
  }),
  period: z.string().optional(),
  participants: z.string().optional(),
})

export type LeadFormData = z.infer<typeof leadFormSchema>
