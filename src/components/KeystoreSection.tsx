import React, { useRef, useState } from 'react';
import {
  Key,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileKey,
  ShieldCheck,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';
import { KeystoreConfig } from '../types';
import { generateStandardJksBuffer, downloadKeystoreFile } from '../utils/keystoreGenerator';

interface KeystoreSectionProps {
  keystore: KeystoreConfig;
  appName: string;
  onChange: (updated: Partial<KeystoreConfig>) => void;
}

export const KeystoreSection: React.FC<KeystoreSectionProps> = ({
  keystore,
  appName,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStorePass, setShowStorePass] = useState(false);
  const [showKeyPass, setShowKeyPass] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange({
        useCustomKeystore: true,
        keystoreFileName: file.name,
        keystoreBase64: base64,
        keyAlias: keystore.keyAlias || file.name.replace(/\.[^/.]+$/, '').toLowerCase(),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleGenerateKeystore = () => {
    const alias = keystore.keyAlias.trim() || 'apkcreator25';
    const storePass = keystore.storePassword || 'apkcreator';
    const keyPass = keystore.keyPassword || storePass || 'apkcreator';
    const certName = keystore.certificateName.trim() || appName || 'Apk Creator 25 Release';
    const org = keystore.organization.trim() || 'Apk Creator 25';
    const years = keystore.validityYears || 25;

    const buffer = generateStandardJksBuffer(alias, storePass, keyPass, certName, org, years);
    const safeName = appName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'apkcreator25';
    const fileName = keystore.keystoreFileName || `${safeName}-release-key.jks`;

    downloadKeystoreFile(buffer, fileName);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);

    // Also auto-attach to config
    const base64 = `data:application/x-java-keystore;base64,${btoa(
      String.fromCharCode(...buffer)
    )}`;
    onChange({
      useCustomKeystore: true,
      keystoreFileName: fileName,
      keystoreBase64: base64,
      keyAlias: alias,
      storePassword: storePass,
      keyPassword: keyPass,
    });
  };

  const handleRemoveKeystoreFile = () => {
    onChange({
      keystoreFileName: '',
      keystoreBase64: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            5
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span>Keystore Signing Credentials</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Keystore Signing
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Provide your custom release keystore or use the built-in auto-key for Play Store and direct installation
            </p>
          </div>
        </div>
      </div>

      {/* Keystore Mode Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {/* Option 1: Standard Auto Keystore */}
        <label
          onClick={() => onChange({ useCustomKeystore: false })}
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
            !keystore.useCustomKeystore
              ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100 shadow-sm'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <input
            type="radio"
            name="keystoreMode"
            checked={!keystore.useCustomKeystore}
            onChange={() => onChange({ useCustomKeystore: false })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1 text-xs">
            <span className="font-semibold text-white block text-sm mb-0.5">
              Auto-Generated Release Key
            </span>
            <span>
              Automatic professional v2/v3 release signing. Ready to install on any Android phone.
            </span>
          </div>
        </label>

        {/* Option 2: Custom Keystore */}
        <label
          onClick={() => onChange({ useCustomKeystore: true })}
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
            keystore.useCustomKeystore
              ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100 shadow-sm'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <input
            type="radio"
            name="keystoreMode"
            checked={keystore.useCustomKeystore}
            onChange={() => onChange({ useCustomKeystore: true })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1 text-xs">
            <span className="font-semibold text-white block text-sm mb-0.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Use Custom Keystore</span>
            </span>
            <span>
              Input your own .jks or .keystore file and credentials (Google Play Store ready).
            </span>
          </div>
        </label>
      </div>

      {/* Custom Keystore Input Details */}
      {keystore.useCustomKeystore ? (
        <div className="space-y-4 pt-2 animate-in fade-in duration-200">
          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileKey className="w-3.5 h-3.5 text-emerald-400" />
                Upload Keystore File (.jks / .keystore)
              </span>
              <span className="text-[11px] text-slate-500">Android Release Key</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jks,.keystore"
              onChange={handleFileChange}
              className="hidden"
            />

            {keystore.keystoreFileName && keystore.keystoreBase64 ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">
                      {keystore.keystoreFileName}
                    </p>
                    <p className="text-[11px] text-emerald-400/80">
                      Keystore Loaded & Ready for Signing
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveKeystoreFile}
                    className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 transition"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                  isDragOver
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-200">
                  Click or drag & drop your <span className="text-emerald-400">.jks</span> or <span className="text-emerald-400">.keystore</span> file here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Standard Java Keystore format
                </p>
              </div>
            )}
          </div>

          {/* Form Grid: Passwords and Alias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Keystore Store Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Keystore Password</span>
                <span className="text-[10px] text-slate-500 font-mono">storePassword</span>
              </label>
              <div className="relative">
                <input
                  type={showStorePass ? 'text' : 'password'}
                  value={keystore.storePassword}
                  onChange={(e) => onChange({ storePassword: e.target.value })}
                  placeholder="apkcreator"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white pr-9 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowStorePass(!showStorePass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showStorePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Key Alias */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Key Alias</span>
                <span className="text-[10px] text-slate-500 font-mono">keyAlias</span>
              </label>
              <input
                type="text"
                value={keystore.keyAlias}
                onChange={(e) => onChange({ keyAlias: e.target.value })}
                placeholder="apkcreator25"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none transition font-mono"
              />
            </div>

            {/* Key Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Key Password</span>
                <span className="text-[10px] text-slate-500 font-mono">keyPassword</span>
              </label>
              <div className="relative">
                <input
                  type={showKeyPass ? 'text' : 'password'}
                  value={keystore.keyPassword}
                  onChange={(e) => onChange({ keyPassword: e.target.value })}
                  placeholder="apkcreator"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white pr-9 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyPass(!showKeyPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showKeyPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Organization / Company */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Organization / Developer Name</span>
                <span className="text-[10px] text-slate-500">Issuer</span>
              </label>
              <input
                type="text"
                value={keystore.organization}
                onChange={(e) => onChange({ organization: e.target.value })}
                placeholder="Apk Creator 25"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none transition"
              />
            </div>
          </div>

          {/* Quick Generator Utility */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Download Signing Keystore
              </span>
              <span className="text-slate-400">
                Generate and download a permanent signed <code className="text-emerald-400 font-mono">.jks</code> file using the details above.
              </span>
            </div>

            <button
              type="button"
              onClick={handleGenerateKeystore}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate & Download .JKS</span>
            </button>
          </div>

          {downloadSuccess && (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>New keystore file generated and downloaded successfully! Store it safely for future updates.</span>
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auto-Generated Release Key Active</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateKeystore}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Keystore (.jks)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px]">Key Alias</span>
              <span className="text-white font-bold">{keystore.keyAlias || 'apkcreator25'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Keystore & Key Password</span>
              <span className="text-white font-bold">{keystore.storePassword || 'apkcreator'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            All builds are signed automatically with standard production signatures (v1, v2, v3, v4). You can download this keystore file at any time to publish or update on Google Play Store.
          </p>
        </div>
      )}
    </div>
  );
};
