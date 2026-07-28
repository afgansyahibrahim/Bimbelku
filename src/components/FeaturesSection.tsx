import { Card, CardContent } from "@/components/ui/card";
import { Monitor, MapPin, User, Users } from "lucide-react";
import Reveal from "@/components/Reveal";

const features = [
  {
    icon: Monitor,
    title: "Kelas Online",
    description: "Belajar melalui tautan pertemuan yang dibagikan tutor",
    color: "bg-teal-light text-teal",
  },
  {
    icon: MapPin,
    title: "Kelas Offline",
    description: "Tutor terdekat datang ke alamat murid dalam radius layanan",
    color: "bg-coral-light text-coral-dark",
  },
  {
    icon: User,
    title: "Privat 1-on-1",
    description: "Fokus penuh dengan pembelajaran personal yang intensif",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    icon: Users,
    title: "Kelas Grup",
    description: "Sistem menggabungkan kebutuhan materi dan jadwal yang sama",
    color: "bg-accent/20 text-accent",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 flex flex-col items-center">
          <Reveal>
             <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Pilih Gaya Belajar yang Cocok
             </h2>
          </Reveal>
          <Reveal delay={0.2}>
             <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Fleksibilitas penuh untuk memilih mode dan tipe kelas sesuai kebutuhanmu
             </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Reveal 
                key={feature.title} 
                delay={index * 0.15} 
                direction="up" 
                width="100%"
                className="h-full"
            >
                <Card className="border-0 bg-card hover:-translate-y-1 cursor-default h-full">
                <CardContent className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
                </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
