// ustatamirci - Temiz Başlangıç ve Örnek Veri Seti (Teklif Modülü Dahil)
const INITIAL_DATA = {
  settings: {
    businessName: "ustatamirci",
    ownerName: "Usta Tamirci Teknik Servis",
    phone: "0532 000 00 00",
    email: "destek@ustatamirci.com",
    address: "Atatürk Cad. No: 45 / Kadıköy - İstanbul",
    taxInfo: "Kadıköy V.D. - 1234567890",
    warrantyMonths: 12,
    serviceTerms: "Değiştirilen orijinal yedek parçalar 1 (bir) yıl ustatamirci servis garantisi altındadır. Garanti kullanıcı hatalarını ve voltaj arızalarını kapsamaz."
  },
  customers: [
    {
      id: "cust-1",
      name: "Ahmet Yılmaz",
      phone: "0532 555 12 34",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Koşuyolu",
      address: "Çıkmaz Sokak No: 12 Daire: 4",
      notes: "Kapı zili çalışmıyor, gelmeden önce aransın.",
      createdAt: "2026-09-01"
    },
    {
      id: "cust-2",
      name: "Mehmet Öztürk",
      phone: "0544 444 88 99",
      city: "İstanbul",
      district: "Üsküdar",
      neighborhood: "Bulgurlu",
      address: "Gürpınar Cad. No: 5 Kat: 2",
      notes: "Klima bakım müşterisi.",
      createdAt: "2026-09-05"
    }
  ],
  devices: [
    {
      id: "dev-1",
      customerId: "cust-1",
      type: "kombi",
      brand: "DemirDöküm",
      model: "Nitromix P 24"
    },
    {
      id: "dev-2",
      customerId: "cust-2",
      type: "klima",
      brand: "Daikin",
      model: "Sensira 12.000 BTU"
    }
  ],
  services: [
    {
      id: "srv-101",
      slipNo: "SRV-2026-001",
      customerId: "cust-1",
      deviceId: "dev-1",
      date: "2026-09-15",
      appointmentTime: "14:30",
      status: "completed",
      faultDescription: "F4 Arıza Kodu (Ateşleme Yok) & Yıllık Bakım",
      actionTaken: "Ateşleme elektrotları temizlendi, gaz valfi basıncı ayarlandı, eşanjör yıkandı.",
      parts: [
        { name: "Ateşleme Elektrot Takımı", qty: 1, price: 450 }
      ],
      partsTotal: 450,
      laborCost: 950,
      totalAmount: 1400,
      paidAmount: 1400,
      remainingAmount: 0,
      paymentMethod: "Nakit",
      isMaintenance: true,
      completedAt: "2026-09-15"
    }
  ],
  proposals: [
    {
      id: "prop-1",
      proposalNo: "TKF-2026-001",
      date: "2026-09-15",
      validDays: 15,
      customerName: "Kemal Demir",
      customerPhone: "0533 111 22 33",
      customerAddress: "Kozyatağı Mah. Bayar Cad. No: 18 / Kadıköy",
      title: "DemirDöküm Premix Yoğuşmalı Kombi Montajı & Değişim Teklifi",
      items: [
        { description: "DemirDöküm Nitromix P 24 kW Yoğuşmalı Kombi", qty: 1, unit: "Adet", unitPrice: 28500 },
        { description: "Eski Kombinin Sökümü & Hurda İndirimi", qty: 1, unit: "Hizmet", unitPrice: -1500 },
        { description: "Yeni Kombi Bağlantı Fleks Seti & Filtreler", qty: 1, unit: "Set", unitPrice: 1200 },
        { description: "İGDAŞ Uygunluk Belgesi & Yetkili Servis Montaj İşçiliği", qty: 1, unit: "Hizmet", unitPrice: 2800 }
      ],
      discount: 1000,
      subtotal: 31000,
      vatType: "dahil",
      grandTotal: 30000,
      terms: "1. Fiyatlarımıza nakliye, eski kombi sökümü ve montaj işçiliği dahildir.\n2. Cihaz montaj sonrası yetkili servisimizce devreye alınacak olup 3 yıl resmi garantilidir.\n3. Ödeme iş tesliminde nakit veya havale/EFT olarak tahsil edilir.",
      status: "sent" // draft, sent, accepted, rejected
    }
  ]
};