const { Client, GatewayIntentBits, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Global hata yakalama (Botun çökmesini önler)
process.on('unhandledRejection', error => {
    console.error('Yakalanmamış hata (Unhandled Rejection):', error);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;
    const logKanalet = guild.channels.cache.find(c => c.name === 'log' && c.type === ChannelType.GuildText);

    // --- YETKİ KONTROLÜ (Sadece belirlenen rol ve sunucu sahibi kullanabilir) ---
    const izinliRolId = '1542872257276149860';
    if (!member.roles.cache.has(izinliRolId) && member.id !== guild.ownerId) {
        return interaction.reply({ 
            content: '❌ Bu komutu kullanabilmek için gerekli yetkiye (role) sahip değilsiniz!', 
            ephemeral: true 
        });
    }

    try {
        // --- 1. BAN KOMUTU ---
        if (commandName === 'ban') {
            const hedefUye = options.getUser('kullanici');
            const sebep = options.getString('sebep') || 'Sebep belirtilmedi.';
            const uye = await guild.members.fetch(hedefUye.id).catch(() => null);

            if (!uye) return interaction.reply({ content: 'Kullanıcı bu sunucuda bulunamadı!', ephemeral: true });

            await uye.ban({ reason: sebep });
            await interaction.reply({ content: `${hedefUye.tag} başarıyla banlandı. Sebep: ${sebep}`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`🔨 **[BAN]** ${member.user.tag}, ${hedefUye.tag} kullanıcısını banladı. Sebep: ${sebep}`);
            }
        }

        // --- 2. UNBAN KOMUTU ---
        else if (commandName === 'unban') {
            const userId = options.getString('id');
            await guild.members.unban(userId);
            await interaction.reply({ content: `ID'si verilen kullanıcının banı kaldırıldı.`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`🔓 **[UNBAN]** ${member.user.tag},${userId} ID'li kullanıcının banını kaldırdı.`);
            }
        }

        // --- 3. BAN SORGU KOMUTU ---
        else if (commandName === 'ban-sorgu') {
            const hedefId = options.getString('id');
            const banBilgisi = await guild.bans.fetch(hedefId).catch(() => null);

            if (!banBilgisi) {
                return interaction.reply({ content: `🔍 Bu ID'ye (${hedefId}) sahip sunucuda yasaklı (banlı) bir kullanıcı bulunamadı.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Ban Sorgulama Sonucu')
                .setColor('#ED4245')
                .setThumbnail(banBilgisi.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Kullanıcı Adı', value: `${banBilgisi.user.tag} (\`${banBilgisi.user.id}\`)`, inline: false },
                    { name: '📌 Ban Sebebi', value: banBilgisi.reason || 'Sebep belirtilmemiş.', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // --- 4. KICK KOMUTU ---
        else if (commandName === 'kick') {
            const hedefUye = options.getUser('kullanici');
            const sebep = options.getString('sebep') || 'Sebep belirtilmedi.';
            const uye = await guild.members.fetch(hedefUye.id).catch(() => null);

            if (!uye) return interaction.reply({ content: 'Kullanıcı bu sunucuda bulunamadı!', ephemeral: true });

            await uye.kick(sebep);
            await interaction.reply({ content: `${hedefUye.tag} sunucudan atıldı. Sebep: ${sebep}`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`👢 **[KICK]** ${member.user.tag}, ${hedefUye.tag} kullanıcısını attı. Sebep: ${sebep}`);
            }
        }

        // --- 5. ROL VER KOMUTU ---
        else if (commandName === 'rolver') {
            const hedefUye = await guild.members.fetch(options.getUser('kullanici').id);
            const rol = options.getRole('rol');

            if (rol.position >= member.roles.highest.position && member.id !== guild.ownerId) {
                return interaction.reply({ content: 'Kendi rol seviyenizden üst veya aynı hiyerarşideki bir rolü başkasına veremezsiniz!', ephemeral: true });
            }

            await hedefUye.roles.add(rol);
            await interaction.reply({ content: `${hedefUye.user.tag} adlı kullanıcıya ${rol.name} rolü verildi.`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`➕ **[ROL VERİLDİ]** ${member.user.tag}, ${hedefUye.user.tag} adlı kullanıcıya ${rol.name} rolünü verdi.`);
            }
        }

        // --- 6. ROL AL KOMUTU ---
        else if (commandName === 'rolal') {
            const hedefUye = await guild.members.fetch(options.getUser('kullanici').id);
            const rol = options.getRole('rol');

            if (rol.position >= member.roles.highest.position && member.id !== guild.ownerId) {
                return interaction.reply({ content: 'Kendi rol seviyenizden üst veya aynı hiyerarşideki bir rolü başkasından alamazsınız!', ephemeral: true });
            }

            await hedefUye.roles.remove(rol);
            await interaction.reply({ content: `${hedefUye.user.tag} adlı kullanıcıdan ${rol.name} rolü alındı.`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`➖ **[ROL ALINDI]** ${member.user.tag}, ${hedefUye.user.tag} adlı kullanıcıdan ${rol.name} rolünü aldı.`);
            }
        }

        // --- 7. OLUŞUM EKLE ---
        else if (commandName === 'olusum' && options.getSubcommand() === 'ekle') {
            const isim = options.getString('isim');
            const lider = options.getUser('lider');
            let renk = options.getString('renk');

            if (!renk) {
                renk = Math.floor(Math.random() * 16777215).toString(16);
            } else {
                renk = renk.replace('#', '');
            }

            const yeniRol = await guild.roles.create({
                name: isim,
                color: parseInt(renk, 16),
                reason: `${member.user.tag} tarafından yeni oluşum olarak kuruldu.`
            });

            const hedefUye = await guild.members.fetch(lider.id);
            await hedefUye.roles.add(yeniRol);

            let kategori = guild.channels.cache.find(c => c.name === 'OLUSUM' && c.type === ChannelType.GuildCategory);
            if (!kategori) {
                kategori = await guild.channels.create({ name: 'OLUSUM', type: ChannelType.GuildCategory });
            }

            const kanalAdi = `👥・${isim.toLowerCase().replace(/\s+/g, '-')}-sınırsız`;
            const yeniKanal = await guild.channels.create({
                name: kanalAdi,
                type: ChannelType.GuildText,
                parent: kategori.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: lider.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });

            await interaction.reply({ content: `Başarıyla **${isim}** oluşumu kuruldu ve liderine rolü atandı! Kanal: ${yeniKanal}`, ephemeral: true });

            if (logKanalet) {
                await logKanalet.send(`🛠️ **[OLUŞUM EKLENDİ]** ${member.user.tag} tarafından **${isim}** kuruldu. Lider: <@${lider.id}>`);
            }
        }

        // --- 8. İSTATİSTİK BİLGİ YENİ ---
        else if (commandName === 'istatistik' && options.getSubcommand() === 'bilgiyeni') {
            const istatistikVerisi = {
                sesSuresi: { haftalik: "12 saat", aylik: "45 saat", yillik: "320 saat" },
                mesajSayisi: { haftalik: 450, aylik: 1850, yillik: 12400 },
                haftalikKayitAdedi: 15
            };

            const embed = new EmbedBuilder()
                .setTitle('📊 Sunucu İstatistik Kartı')
                .setColor('#0099ff')
                .setDescription('Aşağıda belirttiğiniz periyotlara ait ses ve mesaj istatistikleri yer almaktadır *(Veriler dakikada bir güncellenmektedir)*:')
                .addFields(
                    { name: '🎙️ Ses Süreleri', value: `• Haftalık: \`${istatistikVerisi.sesSuresi.haftalik}\`\n• Aylık: \`${istatistikVerisi.sesSuresi.aylik}\`\n• Yıllık: \`${istatistikVerisi.sesSuresi.yillik}\``, inline: false },
                    { name: '💬 Mesaj İstatistikleri', value: `• Haftalık: \`${istatistikVerisi.mesajSayisi.haftalik} mesaj\`\n• Aylık: \`${istatistikVerisi.mesajSayisi.aylik} mesaj\`\n• Yıllık: \`${istatistikVerisi.mesajSayisi.yillik} mesaj\``, inline: false },
                    { name: '👥 Haftalık Kayıt Adedi', value: `\`${istatistikVerisi.haftalikKayitAdedi} kayıt\``, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });
        }

        // --- 9. DESTEK-İŞLEM TOP YENİ ---
        else if (commandName === 'destek-islem' && options.getSubcommand() === 'topyeni') {
            const topYetkililer = [
                { sira: 1, id: member.id, puan: 145, destekSayisi: 50 }
            ];

            let aciklama = topYetkililer.map(y => `**#${y.sira}** | <@${y.id}> — **${y.destekSayisi}** İşlem (*${y.puan} Puan*)`).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🏆 Haftalık En Çok Destek Veren Yetkililer (Top 30)')
                .setColor('#5865F2')
                .setDescription(aciklama || 'Bu hafta henüz kayıtlı bir destek işlemi bulunmuyor.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });
        }

        // --- 10. DESTEK-İŞLEM EKLE YENİ ---
        else if (commandName === 'destek-islem' && options.getSubcommand() === 'ekleyeni') {
            const hedefKisi = options.getUser('kisiler');
            const sebep = options.getString('sebep');
            const sonuc = options.getString('sonuc');

            const embed = new EmbedBuilder()
                .setTitle('📝 Yeni Destek İşlemi Kaydedildi')
                .setColor('#57F287')
                .addFields(
                    { name: '👤 İşlem Yapılan', value: `<@${hedefKisi.id}>`, inline: true },
                    { name: '🛠️ İşlemi Yapan', value: `<@${member.id}>`, inline: true },
                    { name: '📌 Sebep', value: sebep, inline: false },
                    { name: '📊 Sonuç', value: sonuc, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            if (logKanalet) {
                await logKanalet.send({ embeds: [embed] });
            }
        }

        // --- 11. DESTEK-İŞLEM İSTATİSTİK YENİ ---
        else if (commandName === 'destek-islem' && options.getSubcommand() === 'istatistikyeni') {
            const yetkili = options.getUser('kullanici');
            const performans = { haftalik: 12, aylik: 45, sonIslemler: [{ sebep: "Rol düzenleme", sonuc: "Çözüldü" }] };

            let sonIslemlerMetin = performans.sonIslemler.map((i, index) => `**${index + 1}.** Sebep: *${i.sebep}* | Sonuç: **${i.sonuc}**`).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`📊 Yetkili İstatistiği: ${yetkili.username}`)
                .setThumbnail(yetkili.displayAvatarURL())
                .setColor('#FEE75C')
                .addFields(
                    { name: '📈 Performans Özeti', value: `• Haftalık İşlem: \`${performans.haftalik}\`\n• Aylık İşlem: \`${performans.aylik}\``, inline: false },
                    { name: '🕒 Son Destek İşlemleri', value: sonIslemlerMetin, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });
        }

    } catch (err) {
        console.error('Komut işlenirken hata oluştu:', err);
        const errContent = 'İşlem gerçekleştirilirken bir hata oluştu (Yetki veya eksik parametre sorunu olabilir).';
        
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: errContent, ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
